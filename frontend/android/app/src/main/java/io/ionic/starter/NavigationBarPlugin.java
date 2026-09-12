package io.ionic.starter;

import android.view.Window;
import androidx.core.view.WindowCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NavigationBar")
public class NavigationBarPlugin extends Plugin {
    @PluginMethod
    public void setAppearance(PluginCall call) {
        Boolean lightNavigationBars = call.getBoolean("lightNavigationBars");
        if (lightNavigationBars == null) {
            call.reject("lightNavigationBars must be a boolean");
            return;
        }
        getBridge().executeOnMainThread(() -> {
            Window window = getActivity().getWindow();
            WindowCompat.getInsetsController(window, window.getDecorView())
                .setAppearanceLightNavigationBars(lightNavigationBars);
            call.resolve();
        });
    }
}
