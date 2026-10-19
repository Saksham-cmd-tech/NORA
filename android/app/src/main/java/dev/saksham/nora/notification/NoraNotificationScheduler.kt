package dev.saksham.nora.notification

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

object NoraNotificationScheduler {

    private const val TAG = "NoraScheduler"
    private const val PREFS_NAME = "nora_reminder_prefs"
    private const val KEY_REMINDERS = "active_reminders_json"

    const val TWO_HOURS_MILLIS = 2 * 60 * 60 * 1000L
    const val ONE_HOUR_MILLIS = 1 * 60 * 60 * 1000L

    /**
     * Schedules 2-hour and 1-hour pre-departure alarms for a given ticket.
     */
    fun scheduleJourneyReminders(
        context: Context,
        ticketBundle: Bundle,
        departureEpochMillis: Long
    ) {
        val pnr = ticketBundle.getString("pnr", "").trim()
        if (pnr.isEmpty() || departureEpochMillis <= 0) {
            Log.w(TAG, "Cannot schedule reminders: invalid PNR or departure epoch")
            return
        }

        val now = System.currentTimeMillis()
        val remind2hTime = departureEpochMillis - TWO_HOURS_MILLIS
        val remind1hTime = departureEpochMillis - ONE_HOUR_MILLIS

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available")
            return
        }

        val pnrHash = abs(pnr.hashCode())

        // 1. Schedule 2 Hours Departure Alert
        if (remind2hTime > now) {
            val intent2h = Intent(context, NoraAlarmReceiver::class.java).apply {
                action = NoraAlarmReceiver.ACTION_JOURNEY_REMINDER
                putExtra("reminder_type", "2_HOURS")
                putExtra("ticket_data", ticketBundle)
            }
            val requestCode2h = pnrHash * 10 + 2
            val pendingIntent2h = PendingIntent.getBroadcast(
                context,
                requestCode2h,
                intent2h,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            setAlarm(alarmManager, remind2hTime, pendingIntent2h)
            Log.d(TAG, "Scheduled 2-hour reminder for PNR $pnr at $remind2hTime")
        }

        // 2. Schedule 1 Hour Departure Alert
        if (remind1hTime > now) {
            val intent1h = Intent(context, NoraAlarmReceiver::class.java).apply {
                action = NoraAlarmReceiver.ACTION_JOURNEY_REMINDER
                putExtra("reminder_type", "1_HOUR")
                putExtra("ticket_data", ticketBundle)
            }
            val requestCode1h = pnrHash * 10 + 1
            val pendingIntent1h = PendingIntent.getBroadcast(
                context,
                requestCode1h,
                intent1h,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            setAlarm(alarmManager, remind1hTime, pendingIntent1h)
            Log.d(TAG, "Scheduled 1-hour reminder for PNR $pnr at $remind1hTime")
        }

        // Save into persistent prefs for reboot recovery
        saveReminderToPrefs(context, ticketBundle, departureEpochMillis)
    }

    private fun setAlarm(
        alarmManager: AlarmManager,
        triggerAtMillis: Long,
        pendingIntent: PendingIntent
    ) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            } else {
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMillis,
                    pendingIntent
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error setting alarm: ${e.message}", e)
        }
    }

    /**
     * Cancels any active reminder alarms for a given PNR.
     */
    fun cancelJourneyReminders(context: Context, pnr: String) {
        val cleanPnr = pnr.trim()
        if (cleanPnr.isEmpty()) return

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val pnrHash = abs(cleanPnr.hashCode())

        // Cancel 2h
        val intent2h = Intent(context, NoraAlarmReceiver::class.java).apply {
            action = NoraAlarmReceiver.ACTION_JOURNEY_REMINDER
        }
        val pi2h = PendingIntent.getBroadcast(
            context,
            pnrHash * 10 + 2,
            intent2h,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        pi2h?.let { alarmManager.cancel(it) }

        // Cancel 1h
        val intent1h = Intent(context, NoraAlarmReceiver::class.java).apply {
            action = NoraAlarmReceiver.ACTION_JOURNEY_REMINDER
        }
        val pi1h = PendingIntent.getBroadcast(
            context,
            pnrHash * 10 + 1,
            intent1h,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        pi1h?.let { alarmManager.cancel(it) }

        removeReminderFromPrefs(context, cleanPnr)
        Log.d(TAG, "Cancelled reminders for PNR $cleanPnr")
    }

    /**
     * Re-registers all active reminders on system boot.
     */
    fun rescheduleAllReminders(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_REMINDERS, null) ?: return

        try {
            val array = JSONArray(raw)
            val updatedArray = JSONArray()
            val now = System.currentTimeMillis()

            for (i in 0 until array.length()) {
                val item = array.getJSONObject(i)
                val departureEpoch = item.optLong("departureEpochMillis", 0L)
                if (departureEpoch > now) {
                    val bundle = Bundle().apply {
                        putString("pnr", item.optString("pnr"))
                        putString("trainNumber", item.optString("trainNumber"))
                        putString("trainName", item.optString("trainName"))
                        putString("fromCode", item.optString("fromCode"))
                        putString("fromName", item.optString("fromName"))
                        putString("toCode", item.optString("toCode"))
                        putString("toName", item.optString("toName"))
                        putString("departure", item.optString("departure"))
                        putString("coach", item.optString("coach"))
                        putString("seat", item.optString("seat"))
                        putString("platform", item.optString("platform"))
                        putString("pillar", item.optString("pillar"))
                        putString("status", item.optString("status"))
                    }
                    scheduleJourneyReminders(context, bundle, departureEpoch)
                    updatedArray.put(item)
                }
            }

            prefs.edit().putString(KEY_REMINDERS, updatedArray.toString()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error rescheduling reminders on boot: ${e.message}", e)
        }
    }

    private fun saveReminderToPrefs(context: Context, bundle: Bundle, departureEpochMillis: Long) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val pnr = bundle.getString("pnr", "").trim()
        val raw = prefs.getString(KEY_REMINDERS, null)

        val array = try {
            if (raw != null) JSONArray(raw) else JSONArray()
        } catch (_: Exception) {
            JSONArray()
        }

        val filteredArray = JSONArray()
        for (i in 0 until array.length()) {
            val obj = array.getJSONObject(i)
            if (obj.optString("pnr") != pnr) {
                filteredArray.put(obj)
            }
        }

        val newObj = JSONObject().apply {
            put("pnr", pnr)
            put("trainNumber", bundle.getString("trainNumber", ""))
            put("trainName", bundle.getString("trainName", ""))
            put("fromCode", bundle.getString("fromCode", ""))
            put("fromName", bundle.getString("fromName", ""))
            put("toCode", bundle.getString("toCode", ""))
            put("toName", bundle.getString("toName", ""))
            put("departure", bundle.getString("departure", ""))
            put("coach", bundle.getString("coach", ""))
            put("seat", bundle.getString("seat", ""))
            put("platform", bundle.getString("platform", ""))
            put("pillar", bundle.getString("pillar", ""))
            put("status", bundle.getString("status", ""))
            put("departureEpochMillis", departureEpochMillis)
        }
        filteredArray.put(newObj)

        prefs.edit().putString(KEY_REMINDERS, filteredArray.toString()).apply()
    }

    private fun removeReminderFromPrefs(context: Context, pnr: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_REMINDERS, null) ?: return
        try {
            val array = JSONArray(raw)
            val filteredArray = JSONArray()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                if (obj.optString("pnr") != pnr) {
                    filteredArray.put(obj)
                }
            }
            prefs.edit().putString(KEY_REMINDERS, filteredArray.toString()).apply()
        } catch (_: Exception) {}
    }
}
