package com.filipvitas.downhill;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FrameRate")
public class FrameRatePlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        boolean cap = Boolean.TRUE.equals(call.getBoolean("cap", true));
        MainActivity activity = (MainActivity) getActivity();
        activity.runOnUiThread(() -> {
            activity.preferRefreshRate(cap);
            call.resolve();
        });
    }
}
