package com.filipvitas.downhill;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Budget phones hold a steady 60 fps but not 90, and flipping between the two judders.
    private static final float CAP_HZ = 60f;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FrameRatePlugin.class);
        super.onCreate(savedInstanceState);
    }

    // Uncapped clears the preference, so the system runs the panel at whatever it allows.
    @SuppressWarnings("deprecation")
    void preferRefreshRate(boolean cap) {
        int modeId = 0;
        if (cap) {
            Display display = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? getDisplay() : getWindowManager().getDefaultDisplay();
            Display.Mode current = display.getMode();
            Display.Mode best = current;
            for (Display.Mode mode : display.getSupportedModes()) {
                boolean sameSize =
                    mode.getPhysicalWidth() == current.getPhysicalWidth() &&
                    mode.getPhysicalHeight() == current.getPhysicalHeight();
                if (sameSize && Math.abs(mode.getRefreshRate() - CAP_HZ) < Math.abs(best.getRefreshRate() - CAP_HZ)) {
                    best = mode;
                }
            }
            modeId = best.getModeId();
        }
        WindowManager.LayoutParams params = getWindow().getAttributes();
        params.preferredDisplayModeId = modeId;
        getWindow().setAttributes(params);
    }
}
