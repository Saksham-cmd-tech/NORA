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

                        // Status & PNR
                        views.setTextViewText(R.id.text_widget_status, if (status.isNotEmpty()) status else "ACTIVE")
                        views.setTextViewText(R.id.text_widget_pnr, if (pnr.isNotEmpty()) "PNR: $pnr" else "")

                        // Train number & name
                        val titleText = when {
                            trainNumber.isNotEmpty() && trainName.isNotEmpty() -> "$trainNumber · $trainName"
                            trainNumber.isNotEmpty() -> "TRAIN $trainNumber"
                            trainName.isNotEmpty() -> trainName
                            else -> "UPCOMING TRAIN"
                        }
                        views.setTextViewText(R.id.text_train_number_name, titleText)

                        // Route & Timings
                        views.setTextViewText(R.id.text_departure_time, departure)
                        views.setTextViewText(R.id.text_from_station, from)
                        views.setTextViewText(R.id.text_arrival_time, arrival)
                        views.setTextViewText(R.id.text_to_station, to)

                        // Coach & Seat
                        val seatText = StringBuilder().apply {
                            if (coach.isNotEmpty()) append("COACH $coach")
                            if (seat.isNotEmpty()) {
                                if (isNotEmpty()) append(" · ")
                                append("SEAT $seat")
                                if (seatType.isNotEmpty()) append(" ($seatType)")
                            }
                        }.toString()
                        views.setTextViewText(
                            R.id.text_coach_seat,
                            if (seatText.isNotEmpty()) seatText else "CONFIRMED BERTH"
                        )

                        // Date & Platform
                        val footerText = StringBuilder().apply {
                            if (date.isNotEmpty()) append(date)
                            if (platform.isNotEmpty()) {
                                if (isNotEmpty()) append(" · ")
                                append(platform)
                            }
                        }.toString()
                        views.setTextViewText(R.id.text_journey_date_platform, footerText)
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
