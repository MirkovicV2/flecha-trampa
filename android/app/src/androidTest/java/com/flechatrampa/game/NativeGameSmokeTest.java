package com.flechatrampa.game;

import static org.junit.Assert.*;
import static androidx.test.espresso.web.sugar.Web.onWebView;
import static androidx.test.espresso.web.webdriver.DriverAtoms.findElement;
import static androidx.test.espresso.web.webdriver.DriverAtoms.webClick;

import android.content.Context;
import android.content.ContentValues;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.view.KeyEvent;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.espresso.web.webdriver.Locator;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.OutputStream;
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

    @Test(timeout = 180000)
    public void bundledGameKeepsNativeSaveAcrossActivityRecreation() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        SharedPreferences preferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        assertTrue(preferences.edit().clear().commit());

        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
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
            click(activity, "[data-action=open-chest]");
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
            activity.recreate();
            await(activity, "!!document.querySelector('[data-action=play]')");
            click(activity, "[data-action=play]");
            await(activity, "document.querySelectorAll('[data-arrow]').length > 0 && !document.querySelector('.board-loading')");
            assertEquals("true", evaluate(activity, "document.documentElement.dataset.theme === 'neon'"));
            JSONObject finalSave = profile(preferences);
            assertEquals(skin, finalSave.getJSONObject("settings").getString("skin"));
            assertEquals(4, finalSave.getJSONObject("economy").getJSONObject("energy").getInt("amount"));
            assertEquals(1, finalSave.getJSONObject("stats").getInt("played"));
            assertEquals(arrows, finalSave.getJSONObject("classicSave").getJSONObject("state").getJSONObject("board").getJSONArray("arrows").toString());
            capture(context);
        }
    }

    private static void capture(Context context) throws Exception {
        // Shared media survives the test runner's automatic removal of app data.
        Bitmap screenshot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull(screenshot);
        ContentValues image = new ContentValues();
        image.put(MediaStore.Images.Media.DISPLAY_NAME, "native-smoke.png");
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

    private static void click(ActivityScenario<MainActivity> activity, String selector) throws Exception {
        await(activity, "!!document.querySelector(" + JSONObject.quote(selector) + ") && !document.querySelector(" + JSONObject.quote(selector) + ").disabled");
        // A cold WebView on the software-rendered CI emulator can exceed Espresso's 10s default.
        // Keep a bounded wait; every click is still followed by observable UI/native-save assertions.
        onWebView().withTimeout(30, TimeUnit.SECONDS)
            .withElement(findElement(Locator.CSS_SELECTOR, selector)).perform(webClick());
    }

    private static void await(ActivityScenario<MainActivity> activity, String expression) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(evaluate(activity, expression))) return;
            SystemClock.sleep(100);
        }
        fail("WebView did not become ready: " + expression + "; UI: " + evaluate(activity, "document.body.innerText.slice(0, 1800)"));
    }

    private static String evaluate(ActivityScenario<MainActivity> activity, String expression) throws Exception {
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
        assertTrue("No JavaScript result from native WebView", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }
}
