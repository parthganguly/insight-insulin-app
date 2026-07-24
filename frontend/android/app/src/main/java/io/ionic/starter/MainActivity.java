package io.ionic.starter;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.animation.PathInterpolator;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Splash fail-open bound from activity start (issue #107 ratified law). */
    private static final long FAIL_OPEN_TIMEOUT_MS = 6000L;
    private static final long READINESS_POLL_INTERVAL_MS = 50L;

    /** Duplicates tokens.css --paper (paper appearance, #fafaf8). */
    private static final int PORCELAIN_PAPER = 0xFFFAFAF8;
    /** Duplicates tokens.css --paper (ink appearance, #141619). */
    private static final int PORCELAIN_INK = 0xFF141619;

    /** Splash exit fade: tokens.css --motion-micro / --motion-ease. */
    private static final long SPLASH_FADE_DURATION_MS = 160L;

    /**
     * The web bootstrap (index.html / main.tsx) sets window.__APP_APPEARANCE
     * synchronously before first paint and window.__APP_STARTUP_READY once the
     * route shell has committed and a stable frame is scheduled.
     */
    private static final String READINESS_PROBE_JS =
        "window.__APP_STARTUP_READY === true ? (window.__APP_APPEARANCE || 'paper') : ''";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean splashReleased = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !splashReleased);
        splashScreen.setOnExitAnimationListener(provider -> {
            if (isReducedMotionEnabled()) {
                provider.remove();
                syncSystemBarsToWebAppearance();
                return;
            }
            provider
                .getView()
                .animate()
                .alpha(0f)
                .setDuration(SPLASH_FADE_DURATION_MS)
                .setInterpolator(new PathInterpolator(0.2f, 0f, 0f, 1f))
                .withEndAction(() -> {
                    provider.remove();
                    // Splash teardown can replace the decor-view appearance
                    // applied at readiness. Reassert the web-selected paper
                    // or ink contrast only after the splash surface is gone.
                    syncSystemBarsToWebAppearance();
                })
                .start();
        });

        super.onCreate(savedInstanceState);

        applyStartupSurfaces();

        // Fail-open: the splash must release onto the Porcelain post-splash
        // window even if the web layer never reports readiness.
        handler.postDelayed(this::releaseSplash, FAIL_OPEN_TIMEOUT_MS);
        handler.postDelayed(this::pollWebReadiness, READINESS_POLL_INTERVAL_MS);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // uiMode is handled in-process (see AndroidManifest configChanges):
        // realign the backing surface and bar contrast when the OS theme flips.
        applyStartupSurfaces();
        syncSystemBarsToWebAppearance();
    }

    private void applyStartupSurfaces() {
        boolean night = isNightMode();

        // WebView backing surface must be opaque Porcelain, never the WebView
        // default white or a transparent surface that can render black.
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.setBackgroundColor(night ? PORCELAIN_INK : PORCELAIN_PAPER);
        }

        // Edge-to-edge with transparent bars stays on; API 35+ enforces this,
        // older releases are aligned explicitly.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT < 35) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
        }

        // paper → dark system icons, ink → light system icons. Until the web
        // appearance is known this follows the OS; the readiness poll re-syncs
        // for a stored preference that disagrees with the OS.
        applySystemBarIconContrast(!night);
    }

    private void applySystemBarIconContrast(boolean lightBars) {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(lightBars);
        controller.setAppearanceLightNavigationBars(lightBars);
    }

    private void pollWebReadiness() {
        if (splashReleased) {
            return;
        }
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            handler.postDelayed(this::pollWebReadiness, READINESS_POLL_INTERVAL_MS);
            return;
        }
        webView.evaluateJavascript(READINESS_PROBE_JS, value -> {
            if (splashReleased) {
                return;
            }
            String appearance = unquote(value);
            if ("ink".equals(appearance) || "paper".equals(appearance)) {
                applySystemBarIconContrast(!"ink".equals(appearance));
                releaseSplash();
            } else {
                handler.postDelayed(this::pollWebReadiness, READINESS_POLL_INTERVAL_MS);
            }
        });
    }

    private void syncSystemBarsToWebAppearance() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            return;
        }
        webView.evaluateJavascript("window.__APP_APPEARANCE || ''", value -> {
            String appearance = unquote(value);
            if ("ink".equals(appearance) || "paper".equals(appearance)) {
                applySystemBarIconContrast(!"ink".equals(appearance));
            }
        });
    }

    private void releaseSplash() {
        if (splashReleased) {
            return;
        }
        splashReleased = true;
        handler.removeCallbacksAndMessages(null);
    }

    private boolean isNightMode() {
        int nightModeFlags = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return nightModeFlags == Configuration.UI_MODE_NIGHT_YES;
    }

    private boolean isReducedMotionEnabled() {
        float animatorScale = Settings.Global.getFloat(
            getContentResolver(),
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f
        );
        return animatorScale == 0f;
    }

    private static String unquote(String jsResult) {
        if (jsResult == null) {
            return "";
        }
        return jsResult.replace("\"", "").trim();
    }
}
