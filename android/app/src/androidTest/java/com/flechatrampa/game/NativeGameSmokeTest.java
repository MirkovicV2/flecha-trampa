package com.flechatrampa.game;

import static org.junit.Assert.*;

import android.content.Context;
import android.content.ContentValues;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
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
            await(activity, "!!document.querySelector('[data-action=skip-tutorial]')");
            assertEquals("true", evaluate(activity, "window.Capacitor.getPlatform() === 'android'"));
            assertEquals("true", evaluate(activity, "location.origin === 'https://localhost'"));
            click(activity, "[data-action=skip-tutorial]");
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
        }
    }

    private static JSONObject profile(SharedPreferences preferences) throws Exception {
        return new JSONObject(preferences.getString(SAVE_KEY, "{}"));
    }

    private static void click(ActivityScenario<MainActivity> activity, String selector) throws Exception {
        await(activity, "!!document.querySelector(" + JSONObject.quote(selector) + ") && !document.querySelector(" + JSONObject.quote(selector) + ").disabled");
        JSONObject point = new JSONObject(evaluate(activity, "(() => { const e = document.querySelector(" + JSONObject.quote(selector) + "); let r = e.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) { e.scrollIntoView({block: 'center'}); r = e.getBoundingClientRect(); } return {x: r.left + r.width / 2, y: r.top + r.height / 2, viewport: innerWidth}; })()"));
        final float x = (float) point.getDouble("x");
        final float y = (float) point.getDouble("y");
        final float viewport = (float) point.getDouble("viewport");
        final long downTime = SystemClock.uptimeMillis();
        activity.onActivity(instance -> touch(instance.getBridge().getWebView(), downTime, MotionEvent.ACTION_DOWN, x, y, viewport));
        SystemClock.sleep(60);
        activity.onActivity(instance -> touch(instance.getBridge().getWebView(), downTime, MotionEvent.ACTION_UP, x, y, viewport));
    }

    private static void touch(WebView webView, long downTime, int action, float x, float y, float viewport) {
        float scale = webView.getWidth() / viewport;
        MotionEvent event = MotionEvent.obtain(downTime, SystemClock.uptimeMillis(), action, x * scale, y * scale, 0);
        event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
        webView.dispatchTouchEvent(event);
        event.recycle();
    }

    private static void await(ActivityScenario<MainActivity> activity, String expression) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(evaluate(activity, expression))) return;
            SystemClock.sleep(100);
        }
        fail("WebView did not become ready: " + expression);
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
