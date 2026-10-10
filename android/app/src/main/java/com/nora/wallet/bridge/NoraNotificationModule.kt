package com.nora.wallet.bridge

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.nora.wallet.notification.NoraNotificationHelper
import com.nora.wallet.notification.NoraNotificationScheduler

class NoraNotificationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        instanceContext = reactContext
    }

    override fun getName(): String {
        return "NoraNotificationModule"
    }

    @ReactMethod
    fun getStoredData(key: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("nora_storage", android.content.Context.MODE_PRIVATE)
            val value = prefs.getString(key, null)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun setStoredData(key: String, value: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("nora_storage", android.content.Context.MODE_PRIVATE)
            prefs.edit().putString(key, value).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STORAGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isNotificationAccessGranted(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageNames = NotificationManagerCompat.getEnabledListenerPackages(context)
            val isGranted = packageNames.contains(context.packageName)
            promise.resolve(isGranted)
        } catch (e: Exception) {
            promise.reject("ERROR_CHECKING_PERMISSION", e.message, e)
        }
    }

    @ReactMethod
    fun openNotificationAccessSettings(promise: Promise) {
        try {
            val context = reactApplicationContext.currentActivity ?: reactApplicationContext
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_OPENING_SETTINGS", e.message, e)
        }
    }

    @ReactMethod
    fun scanSmsInbox(promise: Promise) {
        try {
            val context = reactApplicationContext
            val uri = android.net.Uri.parse("content://sms/inbox")
            val projection = arrayOf("_id", "address", "body", "date")
            val cursor = context.contentResolver.query(
                uri,
                projection,
                null,
                null,
                "date DESC LIMIT 300"
            )

            val results = Arguments.createArray()
            cursor?.use {
                val addressIdx = it.getColumnIndex("address")
                val bodyIdx = it.getColumnIndex("body")
                val dateIdx = it.getColumnIndex("date")

                while (it.moveToNext()) {
                    val address = if (addressIdx != -1) it.getString(addressIdx) ?: "" else ""
                    val body = if (bodyIdx != -1) it.getString(bodyIdx) ?: "" else ""
                    val date = if (dateIdx != -1) it.getLong(dateIdx) else 0L

                    val isRailMessage = body.contains("IRCTC", ignoreCase = true) ||
                            body.contains("redRail", ignoreCase = true) ||
                            body.contains("PNR", ignoreCase = true) ||
                            body.contains("TRN:", ignoreCase = true) ||
                            body.contains("DOJ:", ignoreCase = true) ||
                            address.contains("IRCTC", ignoreCase = true) ||
                            address.contains("RAIL", ignoreCase = true)

                    if (isRailMessage && body.isNotBlank()) {
                        val map = Arguments.createMap().apply {
                            putString("address", address)
                            putString("body", body)
                            putDouble("date", date.toDouble())
                        }
                        results.pushMap(map)
                    }
                }
            }

            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("ERROR_READING_SMS", e.message, e)
        }
    }

    @ReactMethod
    fun scheduleJourneyReminders(ticketMap: ReadableMap, departureTimestamp: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            val bundle = extractTicketBundle(ticketMap)
            NoraNotificationScheduler.scheduleJourneyReminders(
                context,
                bundle,
                departureTimestamp.toLong()
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_SCHEDULING_REMINDERS", e.message, e)
        }
    }

    @ReactMethod
    fun cancelJourneyReminders(pnr: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            NoraNotificationScheduler.cancelJourneyReminders(context, pnr)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_CANCELING_REMINDERS", e.message, e)
        }
    }

    @ReactMethod
    fun showTicketDetectedNotification(ticketMap: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            val bundle = extractTicketBundle(ticketMap)
            NoraNotificationHelper.showTicketDetectedNotification(context, bundle)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_SHOWING_NOTIFICATION", e.message, e)
        }
    }

    @ReactMethod
    fun showLiveJourney(ticketMap: ReadableMap, liveMap: ReadableMap?, promise: Promise) {
        try {
            val context = reactApplicationContext
            val ticketBundle = extractTicketBundle(ticketMap)
            val liveBundle = extractLiveBundle(liveMap)
            NoraNotificationHelper.showLiveJourneyNotification(context, ticketBundle, liveBundle)
            isLiveJourneyPinned = true
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_SHOWING_LIVE_JOURNEY", e.message, e)
        }
    }

    @ReactMethod
    fun dismissLiveJourney(promise: Promise) {
        try {
            val context = reactApplicationContext
            NoraNotificationHelper.dismissLiveJourneyNotification(context)
            isLiveJourneyPinned = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_DISMISSING_LIVE_JOURNEY", e.message, e)
        }
    }

    @ReactMethod
    fun isLiveJourneyActive(promise: Promise) {
        promise.resolve(isLiveJourneyPinned)
    }

    @ReactMethod
    fun getInitialNotificationAction(promise: Promise) {
        try {
            val action = pendingAction
            pendingAction = null
            promise.resolve(action)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native built-in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for React Native built-in Event Emitter Calls
    }

    private fun extractTicketBundle(ticketMap: ReadableMap): Bundle {
        val bundle = Bundle()

        bundle.putString("pnr", ticketMap.optString("pnr"))
        bundle.putString("status", ticketMap.optString("status", "CONFIRMED"))
        bundle.putString("platform", ticketMap.optString("platform", "5"))
        bundle.putString("pillar", ticketMap.optString("pillar", "11"))

        if (ticketMap.hasKey("train") && !ticketMap.isNull("train")) {
            val train = ticketMap.getMap("train")
            bundle.putString("trainNumber", train?.optString("number"))
            bundle.putString("trainName", train?.optString("name"))
        } else {
            bundle.putString("trainNumber", ticketMap.optString("trainNumber"))
            bundle.putString("trainName", ticketMap.optString("trainName"))
        }

        if (ticketMap.hasKey("journey") && !ticketMap.isNull("journey")) {
            val journey = ticketMap.getMap("journey")
            bundle.putString("fromCode", journey?.optString("from"))
            bundle.putString("fromName", journey?.optString("fromName"))
            bundle.putString("toCode", journey?.optString("to"))
            bundle.putString("toName", journey?.optString("toName"))
            bundle.putString("date", journey?.optString("date"))
            bundle.putString("departure", journey?.optString("departure"))
            bundle.putString("arrival", journey?.optString("arrival"))
        } else {
            bundle.putString("fromCode", ticketMap.optString("fromCode"))
            bundle.putString("fromName", ticketMap.optString("fromName"))
            bundle.putString("toCode", ticketMap.optString("toCode"))
            bundle.putString("toName", ticketMap.optString("toName"))
            bundle.putString("date", ticketMap.optString("date"))
            bundle.putString("departure", ticketMap.optString("departure"))
            bundle.putString("arrival", ticketMap.optString("arrival"))
        }

        if (ticketMap.hasKey("passenger") && !ticketMap.isNull("passenger")) {
            val passenger = ticketMap.getMap("passenger")
            bundle.putString("coach", passenger?.optString("coach"))
            bundle.putString("seat", passenger?.optString("seat"))
            val bookingStatus = passenger?.optString("bookingStatus")
            if (!bookingStatus.isNullOrEmpty()) {
                bundle.putString("status", bookingStatus)
            }
        } else {
            bundle.putString("coach", ticketMap.optString("coach"))
            bundle.putString("seat", ticketMap.optString("seat"))
        }

        return bundle
    }

    private fun extractLiveBundle(liveMap: ReadableMap?): Bundle? {
        if (liveMap == null) return null
        val bundle = Bundle()
        bundle.putString("statusBadgeText", liveMap.optString("statusBadgeText", "ON TIME"))
        bundle.putString("nextStationCode", liveMap.optString("nextStationCode"))
        bundle.putString("nextStationName", liveMap.optString("nextStationName"))
        bundle.putString("nextStationTime", liveMap.optString("nextStationTime"))
        bundle.putString("nextStationPlatform", liveMap.optString("nextStationPlatform", "2"))
        bundle.putString("currentSpeed", liveMap.optString("currentSpeed", "Tracking"))
        bundle.putString("currentStationName", liveMap.optString("currentStationName"))
        if (liveMap.hasKey("isAtStation") && !liveMap.isNull("isAtStation")) {
            bundle.putBoolean("isAtStation", liveMap.getBoolean("isAtStation"))
        }
        return bundle
    }

    private fun ReadableMap.optString(key: String, default: String = ""): String {
        return if (hasKey(key) && !isNull(key)) getString(key) ?: default else default
    }

    companion object {
        private var instanceContext: ReactApplicationContext? = null
        private var pendingAction: WritableMap? = null
        private var isLiveJourneyPinned: Boolean = false

        fun handleNotificationAction(actionType: String, pnr: String, trainNumber: String) {
            if (actionType == NoraNotificationHelper.ACTION_DISMISS_LIVE_ACTIVITY) {
                isLiveJourneyPinned = false
            }

            val params = Arguments.createMap().apply {
                putString("actionType", actionType)
                putString("pnr", pnr)
                putString("trainNumber", trainNumber)
            }
            pendingAction = params

            val context = instanceContext ?: return
            if (!context.hasActiveReactInstance()) return

            try {
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onNotificationActionClicked", params)
            } catch (e: Exception) {
                // Ignore if JS not yet attached
            }
        }

        fun sendNotificationEvent(
            packageName: String,
            title: String,
            text: String,
            timestamp: Long
        ) {
            val context = instanceContext ?: return
            if (!context.hasActiveReactInstance()) return

            val params = Arguments.createMap().apply {
                putString("packageName", packageName)
                putString("title", title)
                putString("text", text)
                putDouble("timestamp", timestamp.toDouble())
            }

            try {
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onNotificationReceived", params)
            } catch (e: Exception) {
                // Ignore if JS not yet attached
            }
        }
    }
}
