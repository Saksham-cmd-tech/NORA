package com.nora.wallet.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.nora.wallet.MainActivity
import com.nora.wallet.R
import org.json.JSONObject

class ActiveTicketWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        updateAllWidgets(context)
    }

    companion object {
        const val PREFS_NAME = "nora_widget_prefs"
        const val KEY_ACTIVE_TICKET = "active_ticket_data"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(KEY_ACTIVE_TICKET, null)
            val views = RemoteViews(context.packageName, R.layout.widget_active_ticket)

            var hasActiveTicket = false
            var pnr = ""
            var trainNumber = ""

            if (!jsonString.isNullOrEmpty()) {
                try {
                    val json = JSONObject(jsonString)
                    if (json.optBoolean("hasTicket", false)) {
                        hasActiveTicket = true
                        pnr = json.optString("pnr", "")
                        trainNumber = json.optString("trainNumber", "")
                        val trainName = json.optString("trainName", "")
                        val from = json.optString("from", "")
                        val to = json.optString("to", "")
                        val departure = json.optString("departure", "--:--")
                        val arrival = json.optString("arrival", "--:--")
                        val coach = json.optString("coach", "")
                        val seat = json.optString("seat", "")
                        val seatType = json.optString("seatType", "")
                        val date = json.optString("date", "")
                        val platform = json.optString("platform", "")
                        val status = json.optString("status", "ACTIVE")

                        views.setViewVisibility(R.id.layout_active_ticket, View.VISIBLE)
                        views.setViewVisibility(R.id.layout_no_ticket, View.GONE)

                        // Status & Journey Date
                        val displayStatus = if (status.isNotEmpty()) status.uppercase() else "CONFIRMED"
                        views.setTextViewText(R.id.text_widget_status, displayStatus)
                        views.setTextViewText(R.id.text_journey_date, if (date.isNotEmpty()) date.uppercase() else "UPCOMING")

                        // Train number & name
                        views.setTextViewText(R.id.text_train_number, if (trainNumber.isNotEmpty()) trainNumber else "TRAIN")
                        views.setTextViewText(R.id.text_train_name, if (trainName.isNotEmpty()) trainName else "Express Service")

                        // Route & Timings
                        views.setTextViewText(R.id.text_departure_time, if (departure.isNotEmpty()) departure else "--:--")
                        views.setTextViewText(R.id.text_from_station, if (from.isNotEmpty()) from else "DEP")
                        views.setTextViewText(R.id.text_arrival_time, if (arrival.isNotEmpty()) arrival else "--:--")
                        views.setTextViewText(R.id.text_to_station, if (to.isNotEmpty()) to else "ARR")

                        // Coach & Seat Badges
                        views.setTextViewText(R.id.text_coach, if (coach.isNotEmpty()) "COACH $coach" else "COACH --")
                        views.setTextViewText(R.id.text_seat, if (seat.isNotEmpty()) "SEAT $seat" else "SEAT --")

                        // Class type
                        val classInfo = if (seatType.isNotEmpty()) "$seatType · Berth" else "Confirmed Berth"
                        views.setTextViewText(R.id.text_class_type, classInfo)

                        // PNR formatted with spaces (e.g. "8492 019 482")
                        val formattedPnr = if (pnr.length == 10) {
                            "${pnr.substring(0, 4)} ${pnr.substring(4, 7)} ${pnr.substring(7)}"
                        } else {
                            pnr
                        }
                        views.setTextViewText(R.id.text_widget_pnr, if (formattedPnr.isNotEmpty()) formattedPnr else "BOARDING PASS")
                    }
                } catch (e: Exception) {
                    hasActiveTicket = false
                }
            }

            if (!hasActiveTicket) {
                views.setViewVisibility(R.id.layout_active_ticket, View.GONE)
                views.setViewVisibility(R.id.layout_no_ticket, View.VISIBLE)
                views.setTextViewText(R.id.text_no_ticket_title, "No Active Ticket")
                views.setTextViewText(
                    R.id.text_no_ticket_subtitle,
                    "IRCTC & redRail bookings appear here automatically"
                )
            }

            // Click Intent to open app
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                if (hasActiveTicket) {
                    putExtra("action_type", "OPEN_ACTIVE_TICKET")
                    putExtra("pnr", pnr)
                    putExtra("train_number", trainNumber)
                } else {
                    putExtra("action_type", "OPEN_WALLET")
                }
            }

            val pendingIntent = PendingIntent.getActivity(
                context,
                widgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(widgetId, views)
        }

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, ActiveTicketWidgetProvider::class.java)
            val ids = appWidgetManager.getAppWidgetIds(componentName)
            if (ids != null && ids.isNotEmpty()) {
                for (id in ids) {
                    updateWidget(context, appWidgetManager, id)
                }
            }
        }
    }
}
