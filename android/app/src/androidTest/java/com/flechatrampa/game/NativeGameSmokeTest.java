package com.flechatrampa.game;

import static org.junit.Assert.*;

import android.content.Context;
import android.content.ContentValues;
import android.app.KeyguardManager;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.view.KeyEvent;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.util.Log;
import android.webkit.WebStorage;
import android.app.Activity;
import android.content.Intent;
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry;
import androidx.test.runner.lifecycle.Stage;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.function.Consumer;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Runs the bundled game through the real WebView, Preferences and Android back button. */
@RunWith(AndroidJUnit4.class)
@SdkSuppress(minSdkVersion = 29)
public class NativeGameSmokeTest {
    private static final String SAVE_KEY = "flecha-trampa:profile:v1";

    /**
     * ActivityScenario also waits for a globally idle looper in onActivity,
     * recreate and close. A running game's Choreographer need never become idle.
     * Use real Android lifecycle transitions and bounded state assertions instead.
     * This helper belongs only to the instrumentation APK.
     */
    private static final class NativeSession implements AutoCloseable {
        static NativeSession launch() {
            Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
            context.startActivity(new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK));
            NativeSession session = new NativeSession();
            session.awaitResumed(null);
            return session;
        }

        void onActivity(Consumer<MainActivity> action) {
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                MainActivity current = resumed();
                assertNotNull("A real MainActivity must be resumed", current);
                action.accept(current);
            });
        }

        void recreate() {
            AtomicReference<MainActivity> previous = new AtomicReference<>();
            onActivity(instance -> {
                previous.set(instance);
                instance.recreate();
            });
            awaitResumed(previous.get());
        }

        private void awaitResumed(MainActivity previous) {
            long deadline = SystemClock.elapsedRealtime() + 30000;
            AtomicReference<Boolean> ready = new AtomicReference<>(false);
            do {
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                    MainActivity current = resumed();
                    ready.set(current != null && current != previous
                        && (previous == null || previous.isDestroyed()));
                });
                if (ready.get()) return;
                SystemClock.sleep(100);
            } while (SystemClock.elapsedRealtime() < deadline);
            fail("Android did not create and resume a new MainActivity within 30s");
        }

        // Called only on the Android main thread, as required by the registry.
        private static MainActivity resumed() {
            MainActivity result = null;
            for (Activity candidate : ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(Stage.RESUMED)) {
                if (candidate instanceof MainActivity) {
                    assertNull("Only one game activity may be resumed", result);
                    result = (MainActivity) candidate;
                }
            }
            return result;
        }

        private static Set<MainActivity> living() {
            Set<MainActivity> result = new LinkedHashSet<>();
            for (Stage stage : Stage.values()) {
                if (stage == Stage.DESTROYED) continue;
                for (Activity candidate : ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(stage)) {
                    if (candidate instanceof MainActivity) result.add((MainActivity) candidate);
                }
            }
            return result;
        }

        @Override public void close() {
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                for (MainActivity instance : living()) instance.finish();
            });
            long deadline = SystemClock.elapsedRealtime() + 30000;
            AtomicReference<Boolean> finished = new AtomicReference<>(false);
            do {
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> finished.set(living().isEmpty()));
                if (finished.get()) return;
                SystemClock.sleep(100);
            } while (SystemClock.elapsedRealtime() < deadline);
            fail("Android did not destroy the test activity within 30s");
        }
    }

    @Test(timeout = 240000)
    public void bundledGameKeepsNativeSaveAcrossActivityRecreation() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        SharedPreferences preferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> WebStorage.getInstance().deleteAllData());
        assertTrue(preferences.edit().clear().commit());

        try (NativeSession activity = NativeSession.launch()) {
            prepareWindow(activity);
            await(activity, "document.readyState === 'complete' && !!document.querySelector('[data-action=skip-tutorial]')");
            assertEquals("true", evaluate(activity, "window.Capacitor.getPlatform() === 'android'"));
            assertEquals("true", evaluate(activity, "location.origin === 'https://localhost'"));
            click(activity, "[data-action=skip-tutorial]");
            await(activity, "!document.querySelector('[data-action=skip-tutorial]')");
            click(activity, "[data-action=play]");
            await(activity, "document.querySelectorAll('[data-arrow]').length > 0 && !document.querySelector('.board-loading')");
            await(activity, "!!document.querySelector('canvas')");
            assertEquals("true", evaluate(activity, "document.documentElement.scrollWidth <= innerWidth"));
            assertEquals("true", evaluate(activity, "document.querySelector('.topbar').getBoundingClientRect().top >= (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0)"));

            click(activity, "[data-action=hint]");
            long saveDeadline = SystemClock.elapsedRealtime() + 15000;
            while (SystemClock.elapsedRealtime() < saveDeadline && profile(preferences).optInt("hints", -1) != 2) {
                SystemClock.sleep(100);
            }
            JSONObject saved = profile(preferences);
            assertEquals(2, saved.getInt("hints"));
            assertTrue(saved.getBoolean("tutorialDone"));
            assertEquals(1, saved.getJSONObject("stats").getInt("played"));
            String arrows = saved.getJSONObject("classicSave").getJSONObject("state").getJSONObject("board").getJSONArray("arrows").toString();

            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            await(activity, "!!document.querySelector('[data-action=resume]')");
            activity.recreate();
            await(activity, "!!document.querySelector('[data-action=play]') && !document.querySelector('[data-action=skip-tutorial]')");
            click(activity, "[data-action=play]");
            await(activity, "document.querySelectorAll('[data-arrow]').length > 0 && !document.querySelector('.board-loading')");
            JSONObject restored = profile(preferences);
            assertEquals(2, restored.getInt("hints"));
            assertEquals(1, restored.getJSONObject("stats").getInt("played"));
            assertEquals(arrows, restored.getJSONObject("classicSave").getJSONObject("state").getJSONObject("board").getJSONArray("arrows").toString());
            assertEquals("true", evaluate(activity, "document.querySelector('[data-lives]').getAttribute('aria-label') === '3 vidas'"));
            assertEquals(4, restored.getJSONObject("economy").getJSONObject("energy").getInt("amount"));

            click(activity, "[data-action=pause]");
            click(activity, "[data-action=home]");
            click(activity, "[data-action=rewards]");
            click(activity, ".rewards-tabs [data-action=collection]");
            assertEquals("Native animation coverage requires normal system motion", "false", evaluate(activity, "matchMedia('(prefers-reduced-motion: reduce)').matches"));
            // Native dispatch can return after an animation has started. Observe the whole lifecycle
            // in the real WebView instead of polling a transient phase after the click returns.
            evaluate(activity, "(() => { window.__nativeChestPhases = []; window.__nativeChestObserver = new MutationObserver(() => { const phase = document.querySelector('[data-case-phase]')?.dataset.casePhase; if (phase && window.__nativeChestPhases.at(-1) !== phase) window.__nativeChestPhases.push(phase); }); window.__nativeChestObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-case-phase'] }); return true; })()");
            click(activity, "[data-action=open-chest]");
            await(activity, "document.querySelector('[data-case-phase]')?.dataset.casePhase === 'revealed'");
            assertEquals("true", evaluate(activity, "['sealed', 'rolling', 'settling', 'revealed'].every(phase => window.__nativeChestPhases.includes(phase))"));
            evaluate(activity, "window.__nativeChestObserver.disconnect(); true");
            assertEquals(1, profile(preferences).getJSONObject("economy").getJSONObject("collection").getInt("opened"));
            assertEquals(0, profile(preferences).getJSONObject("economy").getJSONObject("collection").getInt("keys"));
            click(activity, "[data-action=equip-drop]");
            await(activity, "!document.querySelector('[role=dialog]')");
            click(activity, "[data-action=theme][data-value=neon]");
            await(activity, "document.documentElement.dataset.theme === 'neon'");
            long cosmeticDeadline = SystemClock.elapsedRealtime() + 15000;
            while (SystemClock.elapsedRealtime() < cosmeticDeadline && !"neon".equals(profile(preferences).getJSONObject("settings").optString("theme"))) {
                SystemClock.sleep(100);
            }
            JSONObject cosmetics = profile(preferences);
            String skin = cosmetics.getJSONObject("settings").getString("skin");
            assertNotEquals("classic", skin);
            assertEquals(0, cosmetics.getJSONObject("economy").getJSONObject("collection").getInt("chests"));
            assertEquals("neon", cosmetics.getJSONObject("settings").getString("theme"));

            click(activity, ".rewards-tabs [data-action=worlds]");
            click(activity, "[data-action=unlock-world][data-value=christmas]");
            await(activity, "document.documentElement.dataset.world === 'christmas'");
            click(activity, ".rewards-tabs [data-action=pass]");
            click(activity, "[data-action=buy-pass]");
            await(activity, "!!document.querySelector('.commerce-card') && document.querySelector('.commerce-card').innerText.includes('COMPRA DE PRUEBA')");
            click(activity, "[data-preview-confirm]");
            await(activity, "!document.querySelector('.commerce-card') && document.querySelector('.premium-summary').innerText.includes('Pase Plus de prueba activo')");
            assertEquals("true", evaluate(activity, "document.querySelector('[data-energy-amount]').textContent === '4/8'"));
            activity.recreate();
            await(activity, "!!document.querySelector('[data-action=play]')");
            click(activity, "[data-action=play]");
            await(activity, "document.querySelectorAll('[data-arrow]').length > 0 && !document.querySelector('.board-loading')");
            assertEquals("true", evaluate(activity, "document.documentElement.dataset.theme === 'neon'"));
            assertEquals("true", evaluate(activity, "document.documentElement.dataset.world === 'christmas'"));
            await(activity, "document.querySelector('[data-energy-amount]').textContent === '4/8'");
            JSONObject finalSave = profile(preferences);
            assertEquals(skin, finalSave.getJSONObject("settings").getString("skin"));
            assertEquals(4, finalSave.getJSONObject("economy").getJSONObject("energy").getInt("amount"));
            assertEquals(1, finalSave.getJSONObject("stats").getInt("played"));
            assertEquals("christmas", finalSave.getJSONObject("settings").getString("world"));
            assertEquals(0, finalSave.getJSONObject("events").getInt("stamps"));
            assertEquals(0, finalSave.getJSONObject("economy").getJSONObject("collection").getInt("keys"));
            assertEquals(arrows, finalSave.getJSONObject("classicSave").getJSONObject("state").getJSONObject("board").getJSONArray("arrows").toString());
            captureBoard(context, activity, "native-smoke.png");
        }
    }

    @Test(timeout = 240000)
    public void shapedChallengeAndRouteInspectionSurviveNativeRecreation() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        SharedPreferences preferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> WebStorage.getInstance().deleteAllData());
        // Seed before launching: changing Preferences under a live Activity races
        // its lifecycle save and can replace the fixture with the previous profile.
        JSONObject fixture;
        try (InputStream input = InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("season-profile.json")) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            for (int count; (count = input.read(buffer)) != -1;) bytes.write(buffer, 0, count);
            fixture = new JSONObject(bytes.toString(StandardCharsets.UTF_8.name()));
        }
        fixture.getJSONObject("economy").getJSONObject("energy").put("updatedAt", System.currentTimeMillis());
        assertTrue(preferences.edit().clear().putString(SAVE_KEY, fixture.toString()).commit());
        try (NativeSession activity = NativeSession.launch()) {
            prepareWindow(activity);
            await(activity, "!!document.querySelector('.hero-play')");
            click(activity, "[data-action=rewards]");
            await(activity, "document.querySelector('[data-pass-xp]').textContent === '4000 XP'");
            await(activity, "document.querySelectorAll('[data-action=claim-reward]').length === 80");
            click(activity, "[data-action=claim-reward][data-value='free:40']");
            await(activity, "document.querySelector('[data-action=claim-reward][data-value=\"free:40\"]').disabled");
            click(activity, "[data-action=claim-reward][data-value='free:2']");
            await(activity, "document.querySelector('[data-action=claim-reward][data-value=\"free:2\"]').disabled");
            click(activity, ".rewards-tabs [data-action=collection]");
            assertEquals("true", evaluate(activity, "document.querySelectorAll('[data-collection-skin]').length === 32"));
            click(activity, "[data-action=skin][data-value=phoenix]");
            assertEquals("true", evaluate(activity, "document.querySelector('[data-key-count]').textContent === '1'"));
            click(activity, "[data-action=open-chest]");
            await(activity, "document.querySelector('[data-case-phase]')?.dataset.casePhase === 'revealed'");
            click(activity, "[data-action=close-overlay]");
            await(activity, "!document.querySelector('[data-case-phase]')");
            assertEquals("true", evaluate(activity, "document.querySelector('[data-action=open-chest]').disabled && document.querySelector('[data-key-count]').textContent === '0' && document.querySelector('#chest-opening-cost').textContent.includes('1 cofre y 1 llave')"));
            assertEquals(1, profile(preferences).getJSONObject("economy").getJSONObject("collection").getInt("chests"));
            assertEquals(0, profile(preferences).getJSONObject("economy").getJSONObject("collection").getInt("keys"));
            click(activity, "[data-action=home]");
            click(activity, "[data-action=shared]");
            await(activity, "!!document.querySelector('#challenge-shape')");
            evaluate(activity, "document.querySelector('#challenge-seed').value = 'native-mask-060'; document.querySelector('#challenge-size').value = '8'; document.querySelector('#challenge-shape').value = 'diamond'; document.querySelector('#challenge-complexity').value = '1'; true");
            click(activity, "[data-action=shared-create]");
            click(activity, "[data-action=shared-play]");
            await(activity, "!document.querySelector('.board-loading') && document.querySelectorAll('[data-arrow]').length === 28");
            assertEquals("true", evaluate(activity, "document.querySelector('.board-frame').dataset.shape === 'diamond'"));
            assertEquals("true", evaluate(activity, "document.documentElement.scrollWidth <= innerWidth"));
            click(activity, "[data-action=inspect-routes]");
            click(activity, "[data-arrow]");
            await(activity, "!!document.querySelector('.route-overlay svg')");
            assertEquals("true", evaluate(activity, "document.querySelectorAll('[data-arrow]').length === 28 && document.querySelector('[data-lives]').getAttribute('aria-label') === '3 vidas' && document.querySelector('[data-hints]').textContent === '3'"));
            click(activity, "[data-action=inspect-routes]");
            await(activity, "!document.querySelector('.route-overlay svg')");
            click(activity, "[data-action=hint]");
            await(activity, "document.querySelector('[data-hints]').textContent === '2'");
            long deadline = SystemClock.elapsedRealtime() + 15000;
            while (SystemClock.elapsedRealtime() < deadline && profile(preferences).optInt("hints", -1) != 2) SystemClock.sleep(100);
            assertEquals(1, profile(preferences).getJSONObject("sharedSave").getInt("hintsUsed"));
            assertEquals(5, profile(preferences).getJSONObject("economy").getJSONObject("energy").getInt("amount"));
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            await(activity, "!!document.querySelector('[data-action=resume]')");
            activity.recreate();
            await(activity, "!!document.querySelector('.hero-play')");
            click(activity, "[data-action=shared]");
            click(activity, "[data-action=shared-play]");
            await(activity, "!document.querySelector('.board-loading') && document.querySelectorAll('[data-arrow]').length === 28");
            JSONObject saved = profile(preferences);
            assertEquals("chain-v2", saved.getJSONObject("sharedSave").getJSONObject("config").getString("tuning"));
            assertEquals("phoenix", saved.getJSONObject("settings").getString("skin"));
            assertEquals(0, saved.getJSONObject("economy").getJSONObject("collection").getInt("keys"));
            assertTrue(saved.getJSONObject("economy").getJSONObject("pass").getJSONArray("claimed").toString().contains("free:40"));
            assertEquals("diamond", saved.getJSONObject("sharedSave").getJSONObject("config").getString("shape"));
            assertEquals(1, saved.getJSONObject("sharedSave").getInt("hintsUsed"));
            assertEquals(1, saved.getJSONObject("stats").getInt("played"));
            assertEquals("true", evaluate(activity, "document.querySelector('.board-frame').dataset.shape === 'diamond' && document.querySelector('[data-hints]').textContent === '2'"));
            captureBoard(context, activity, "native-silhouette.png");
        }
    }

    private static void captureBoard(Context context, NativeSession activity, String filename) throws Exception {
        // DOM readiness can precede the Android compositor. Require actual arrow pixels,
        // not just buttons under an old loading frame, before retaining visual evidence.
        evaluate(activity, "window.__nativePaintReady = false; requestAnimationFrame(() => requestAnimationFrame(() => { window.__nativePaintReady = true; })); true");
        await(activity, "window.__nativePaintReady === true");
        JSONObject board = new JSONObject(evaluate(activity, "(() => { const r = document.querySelector('.board-frame').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, viewport: innerWidth }; })()"));
        int[] origin = new int[2];
        AtomicReference<Integer> viewWidth = new AtomicReference<>(0);
        activity.onActivity(instance -> {
            instance.getBridge().getWebView().getLocationOnScreen(origin);
            viewWidth.set(instance.getBridge().getWebView().getWidth());
        });
        double scale = viewWidth.get() / board.getDouble("viewport");
        assertTrue("WebView must have measurable bounds", scale > 0);
        long deadline = SystemClock.elapsedRealtime() + 15000;
        int samples = 0;
        do {
            Bitmap screenshot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            assertNotNull(screenshot);
            int left = Math.max(0, (int) (origin[0] + (board.getDouble("x") + board.getDouble("width") * 0.08) * scale));
            int right = Math.min(screenshot.getWidth(), (int) (origin[0] + (board.getDouble("x") + board.getDouble("width") * 0.92) * scale));
            int top = Math.max(0, (int) (origin[1] + (board.getDouble("y") + board.getDouble("height") * 0.08) * scale));
            int bottom = Math.min(screenshot.getHeight(), (int) (origin[1] + (board.getDouble("y") + board.getDouble("height") * 0.92) * scale));
            samples = 0;
            for (int y = top; y < bottom; y += 4) {
                for (int x = left; x < right; x += 4) {
                    int pixel = screenshot.getPixel(x, y);
                    int max = Math.max(Color.red(pixel), Math.max(Color.green(pixel), Color.blue(pixel)));
                    // Muted loading text stays below 190. White/metal skins must count too.
                    if (max > 190) samples++;
                }
            }
            if (samples >= 20) {
                Log.i("FlechaSmoke", "Native board paint verified: " + samples + " bright samples in " + filename);
                saveCapture(context, screenshot, filename);
                return;
            }
            screenshot.recycle();
            SystemClock.sleep(200);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("Native board did not paint arrow highlights within 15s: " + samples + " samples");
    }

    private static void saveCapture(Context context, Bitmap screenshot, String filename) throws Exception {
        // Shared media survives the test runner's automatic removal of app data.
        ContentValues image = new ContentValues();
        image.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
        image.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        image.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/FlechaTrampaTest");
        image.put(MediaStore.Images.Media.IS_PENDING, 1);
        Uri imageUri = context.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, image);
        assertNotNull(imageUri);
        try (OutputStream output = context.getContentResolver().openOutputStream(imageUri)) {
            assertNotNull(output);
            assertTrue(screenshot.compress(Bitmap.CompressFormat.PNG, 100, output));
        }
        screenshot.recycle();
        image.clear();
        image.put(MediaStore.Images.Media.IS_PENDING, 0);
        context.getContentResolver().update(imageUri, image, null, null);
    }

    private static JSONObject profile(SharedPreferences preferences) throws Exception {
        return new JSONObject(preferences.getString(SAVE_KEY, "{}"));
    }

    /** Test-device setup only; the shipped Activity does not bypass a user's lock screen. */
    private static void prepareWindow(NativeSession activity) {
        activity.onActivity(instance -> {
            instance.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            instance.setTurnScreenOn(true);
            KeyguardManager keyguard = instance.getSystemService(KeyguardManager.class);
            Log.i("FlechaSmoke", "Window ready: focus=" + instance.hasWindowFocus() + ", keyguard=" + keyguard.isKeyguardLocked());
            if (keyguard.isKeyguardLocked()) {
                instance.setShowWhenLocked(true);
                keyguard.requestDismissKeyguard(instance, null);
            }
        });
    }

    private static void click(NativeSession activity, String selector) throws Exception {
        prepareWindow(activity);
        Log.i("FlechaSmoke", "Click: " + selector);
        long focusDeadline = SystemClock.elapsedRealtime() + 30000;
        AtomicReference<Boolean> focused = new AtomicReference<>(false);
        do {
            activity.onActivity(instance -> focused.set(instance.hasWindowFocus()));
            if (focused.get()) break;
            SystemClock.sleep(100);
        } while (SystemClock.elapsedRealtime() < focusDeadline);
        if (!focused.get()) {
            Bitmap screenshot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            if (screenshot != null) saveCapture(InstrumentationRegistry.getInstrumentation().getTargetContext(), screenshot, "native-focus-failure.png");
        }
        assertTrue("Native activity must have window focus before clicking " + selector, focused.get());
        // A game with continuous animation cannot satisfy Espresso's global
        // main-looper-idle requirement. Locate a genuinely hittable control and
        // send real touchscreen events instead of stopping animation or invoking
        // a synthetic DOM click. All post-action/save assertions remain in place.
        String target = "(() => { for (const element of document.querySelectorAll(" + JSONObject.quote(selector) + ")) {"
            + "if (element.disabled || element.closest('[inert], [hidden]') || getComputedStyle(element).visibility === 'hidden') continue;"
            + "element.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});"
            + "const r=element.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;"
            + "if (r.width<=0 || r.height<=0 || x<0 || y<0 || x>=innerWidth || y>=innerHeight) continue;"
            + "const hit=document.elementFromPoint(x,y); if (hit && element.contains(hit)) return {x,y,viewport:innerWidth};"
            + "} return false; })()";
        await(activity, "Boolean(" + target + ")");
        evaluate(activity, "window.__nativeTapFrameReady=false; requestAnimationFrame(() => requestAnimationFrame(() => {window.__nativeTapFrameReady=true;})); true");
        await(activity, "window.__nativeTapFrameReady===true");
        JSONObject point = new JSONObject(evaluate(activity, target));
        int[] origin = new int[2];
        AtomicReference<Integer> viewWidth = new AtomicReference<>(0);
        activity.onActivity(instance -> {
            instance.getBridge().getWebView().getLocationOnScreen(origin);
            viewWidth.set(instance.getBridge().getWebView().getWidth());
        });
        double scale = viewWidth.get()/point.getDouble("viewport");
        assertTrue("Native tap scale must be measurable", scale > 0);
        float x = (float) (origin[0]+point.getDouble("x")*scale);
        float y = (float) (origin[1]+point.getDouble("y")*scale);
        Log.i("FlechaSmoke", "Native tap: " + selector + " at " + x + "," + y + "; scale=" + scale);
        long downTime = SystemClock.uptimeMillis();
        MotionEvent down = MotionEvent.obtain(downTime,downTime,MotionEvent.ACTION_DOWN,x,y,0);
        down.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        try {
            assertTrue("Native touch down must be accepted", InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(down,true));
            SystemClock.sleep(50);
            MotionEvent up = MotionEvent.obtain(downTime,SystemClock.uptimeMillis(),MotionEvent.ACTION_UP,x,y,0);
            up.setSource(InputDevice.SOURCE_TOUCHSCREEN);
            try {
                assertTrue("Native touch up must be accepted", InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(up,true));
            } finally { up.recycle(); }
        } finally { down.recycle(); }
    }

    private static void await(NativeSession activity, String expression) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(evaluate(activity, expression))) return;
            SystemClock.sleep(100);
        }
        fail("WebView did not become ready: " + expression + "; UI: " + evaluate(activity, "document.body.innerText.slice(0, 1800)"));
    }

    private static String evaluate(NativeSession activity, String expression) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>("false");
        activity.onActivity(instance -> {
            if (instance.getBridge() == null || instance.getBridge().getWebView() == null) {
                latch.countDown();
                return;
            }
            instance.getBridge().getWebView().evaluateJavascript(expression, value -> {
                result.set(value);
                latch.countDown();
            });
        });
        // The cold software-rendered emulator logged 1109 skipped frames during startup.
        // Match the bounded 30s native click/readiness budget; still require the real result.
        assertTrue("No JavaScript result within 30s: " + expression.substring(0, Math.min(120, expression.length())), latch.await(30, TimeUnit.SECONDS));
        return result.get();
    }
}
