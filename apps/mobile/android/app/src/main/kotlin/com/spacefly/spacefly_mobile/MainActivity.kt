package com.spacefly.spacefly_mobile

import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    // The recent-apps thumbnail is taken when the app leaves the screen: marking the window secure for that moment keeps the amounts out
    // of it, and clearing the mark on return keeps screenshots working while the app is in use.
    override fun onPause() {
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
}
