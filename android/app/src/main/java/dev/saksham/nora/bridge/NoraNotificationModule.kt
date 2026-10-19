package dev.saksham.nora.bridge

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
import dev.saksham.nora.notification.NoraNotificationHelper
import dev.saksham.nora.notification.NoraNotificationScheduler
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import android.util.Base64
import org.json.JSONObject
import org.json.JSONArray

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
    fun getInitialSharedText(promise: Promise) {
        val text = pendingSharedText
        pendingSharedText = null
        promise.resolve(text)
    }

    @ReactMethod
    fun clearSharedText(promise: Promise) {
        pendingSharedText = null
        promise.resolve(true)
    }

    @ReactMethod
    fun scanSmsInbox(promise: Promise) {
        promise.resolve(Arguments.createArray())
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

    @ReactMethod
    fun queryNtesLive(trainNumber: String, stationCode: String, promise: Promise) {
        Thread {
            try {
                val cleanNumber = trainNumber.trim()
                val cleanStation = stationCode.trim().uppercase()
                if (cleanNumber.isEmpty()) {
                    promise.resolve(null)
                    return@Thread
                }

                val instPayload = "service=TrainRunningMob&subService=GetTrainInstance&trainNo=$cleanNumber"
                val instData = NtesNativeHelper.query(instPayload)
                val rawTrainName = instData.optString("TrainName", "")

                val instances = instData.optJSONArray("vInstanceList")
                var startDate = ""
                if (instances != null && instances.length() > 0) {
                    for (i in 0 until instances.length()) {
                        val inst = instances.getJSONObject(i)
                        if (inst.optInt("trainStatus", 0) == 1) {
                            startDate = inst.optString("startDate", "")
                            break
                        }
                    }
                    if (startDate.isEmpty()) {
                        startDate = instances.getJSONObject(0).optString("startDate", "")
                    }
                }

                if (startDate.isEmpty()) {
                    val result = JSONObject()
                    result.put("success", true)
                    result.put("trainNumber", cleanNumber)
                    result.put("trainName", rawTrainName)
                    result.put("platform", "")
                    result.put("isLive", false)
                    promise.resolve(result.toString())
                    return@Thread
                }

                val fullPayload = "service=TrainRunningMob&subService=ShowFullRunJson&trainNo=$cleanNumber&startDate=$startDate"
                val fullRun = NtesNativeHelper.query(fullPayload)
                val stations = fullRun.optJSONArray("STNS")

                var resolvedPlatform = ""
                var coachPos = ""
                var delayMinutes = fullRun.optInt("LDEL", 0)
                var currentStatus = fullRun.optString("CPOS", "")

                if (stations != null && stations.length() > 0) {
                    for (i in 0 until stations.length()) {
                        val s = stations.getJSONObject(i)
                        val sc = s.optString("SC", "").uppercase()
                        if (sc == cleanStation) {
                            val pf = s.optString("PF", "")
                            if (pf.isNotEmpty() && pf != "TBD") {
                                resolvedPlatform = pf
                            }
                            coachPos = s.optString("departureCoachPosition", "")
                            if (coachPos.isEmpty()) {
                                coachPos = s.optString("arrivalCoachPosition", "")
                            }
                            break
                        }
                    }
                }

                val result = JSONObject()
                result.put("success", true)
                result.put("trainNumber", cleanNumber)
                result.put("trainName", fullRun.optString("TNM", rawTrainName))
                result.put("startDate", startDate)
                result.put("platform", resolvedPlatform)
                result.put("coachPosition", coachPos)
                result.put("currentStatus", currentStatus)
                result.put("delayMinutes", delayMinutes)
                result.put("isLive", true)
                promise.resolve(result.toString())
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }.start()
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
        var pendingSharedText: String? = null

        fun handleSharedText(text: String?) {
            if (text.isNullOrBlank()) return
            pendingSharedText = text

            val context = instanceContext ?: return
            if (!context.hasActiveReactInstance()) return

            try {
                val params = Arguments.createMap().apply {
                    putString("text", text)
                }
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onSharedTextReceived", params)
            } catch (e: Exception) {
                // Ignore if JS not yet attached
            }
        }

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

object NtesNativeHelper {
    private val KEY_BYTES = "8EA4DB2CC1EB3DC5".toByteArray(Charsets.UTF_8)
    private val IV_BYTES = "7DC5EB3BB4DB6EA8".toByteArray(Charsets.UTF_8)
    private const val SCKEY = "645fbc1e56e23365f2f3c204ae0899f6"
    private const val NTES_URL = "https://enquiry.indianrail.gov.in/crisns/AppServAnd"

    private fun md5(input: String): String {
        val md = MessageDigest.getInstance("MD5")
        val digest = md.digest(input.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02X".format(it) }
    }

    private fun encrypt(text: String): String {
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(KEY_BYTES, "AES"), IvParameterSpec(IV_BYTES))
        val encrypted = cipher.doFinal(text.toByteArray(Charsets.UTF_8))
        val b64 = Base64.encodeToString(encrypted, Base64.NO_WRAP)
        return b64.toByteArray(Charsets.UTF_8).joinToString("") { "%02X".format(it) }
    }

    private fun decrypt(hexStr: String): JSONObject {
        val cleanHex = if (hexStr.contains("#")) hexStr.split("#")[1] else hexStr
        val b64Bytes = ByteArray(cleanHex.length / 2) { i ->
            cleanHex.substring(i * 2, i * 2 + 2).toInt(16).toByte()
        }
        val b64Str = String(b64Bytes, Charsets.UTF_8)
        val cipherBytes = Base64.decode(b64Str, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(KEY_BYTES, "AES"), IvParameterSpec(IV_BYTES))
        val decrypted = cipher.doFinal(cipherBytes)
        return JSONObject(String(decrypted, Charsets.UTF_8))
    }

    fun query(payload: String): JSONObject {
        val wire = "${md5(payload + SCKEY)}#${encrypt(payload)}"
        val url = URL(NTES_URL)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("User-Agent", "Dalvik/2.1.0 (Linux; Android 11)")
        conn.doOutput = true
        conn.connectTimeout = 8000
        conn.readTimeout = 8000

        val body = JSONObject().put("jsonIn", wire).toString()
        OutputStreamWriter(conn.outputStream).use { it.write(body) }

        val responseCode = conn.responseCode
        if (responseCode != 200) {
            throw Exception("NTES HTTP $responseCode")
        }

        val responseText = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
        val resJson = JSONObject(responseText)
        val jsonIn = resJson.optString("jsonIn")
        if (jsonIn.isEmpty()) {
            throw Exception("Missing jsonIn")
        }
        return decrypt(jsonIn)
    }
}
