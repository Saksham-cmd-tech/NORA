package dev.saksham.nora.widget

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NoraWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NoraWidgetModule"

    @ReactMethod
    fun updateActiveTicket(ticketJsonString: String?, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                ActiveTicketWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            prefs.edit().putString(ActiveTicketWidgetProvider.KEY_ACTIVE_TICKET, ticketJsonString).apply()
            ActiveTicketWidgetProvider.updateAllWidgets(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_UPDATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearActiveTicket(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                ActiveTicketWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            prefs.edit().remove(ActiveTicketWidgetProvider.KEY_ACTIVE_TICKET).apply()
            ActiveTicketWidgetProvider.updateAllWidgets(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_CLEAR_ERROR", e.message, e)
        }
    }
}
