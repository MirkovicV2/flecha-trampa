package com.flechatrampa.game;

import static org.junit.Assert.*;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.view.KeyEvent;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Runs the bundled game through the real WebView, Preferences and Android back button. */
@RunWith(AndroidJUnit4.class)
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

            Bitmap screenshot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            assertNotNull(screenshot);
            try (FileOutputStream output = new FileOutputStream(new File(context.getExternalFilesDir(null), "native-smoke.png"))) {
                assertTrue(screenshot.compress(Bitmap.CompressFormat.PNG, 100, output));
            }
            screenshot.recycle();

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
        await(activity, "!!document.querySelector(" + JSONObject.quote(selector) + ")");
        evaluate(activity, "document.querySelector(" + JSONObject.quote(selector) + ").click(); true");
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
