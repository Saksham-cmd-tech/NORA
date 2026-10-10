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
        if (intent.action == ACTION_FLIP_TICKET) {
            val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val currentIndex = prefs.getInt("widget_idx_$widgetId", 0)
                val total = prefs.getInt("widget_total_$widgetId", 1)
                val nextIndex = if (total > 0) (currentIndex + 1) % total else 0
                prefs.edit().putInt("widget_idx_$widgetId", nextIndex).apply()

                val appWidgetManager = AppWidgetManager.getInstance(context)
                updateWidget(context, appWidgetManager, widgetId)
                return
            }
        }
        updateAllWidgets(context)
    }

    companion object {
        const val PREFS_NAME = "nora_widget_prefs"
        const val KEY_ACTIVE_TICKET = "active_ticket_data"
        const val ACTION_FLIP_TICKET = "com.nora.wallet.ACTION_FLIP_TICKET"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(KEY_ACTIVE_TICKET, null)
            val views = RemoteViews(context.packageName, R.layout.widget_active_ticket)

            val tickets = mutableListOf<JSONObject>()
            if (!jsonString.isNullOrEmpty()) {
                try {
                    val root = JSONObject(jsonString)
                    if (root.optBoolean("hasTicket", false)) {
                        val ticketsArray = root.optJSONArray("tickets")
                        if (ticketsArray != null && ticketsArray.length() > 0) {
                            for (i in 0 until ticketsArray.length()) {
                                tickets.add(ticketsArray.getJSONObject(i))
                            }
                        } else {
                            tickets.add(root)
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            val total = tickets.size
            prefs.edit().putInt("widget_total_$widgetId", total).apply()

            if (total > 0) {
                val rawIndex = prefs.getInt("widget_idx_$widgetId", 0)
                val currentIndex = if (total > 0) rawIndex % total else 0
                val ticket = tickets[currentIndex]

                val pnr = ticket.optString("pnr", "")
                val trainNumber = ticket.optString("trainNumber", "")
                val trainName = ticket.optString("trainName", "")
                val from = ticket.optString("from", "")
                val to = ticket.optString("to", "")
                val departure = ticket.optString("departure", "--:--")
                val arrival = ticket.optString("arrival", "--:--")
                val coach = ticket.optString("coach", "")
                val seat = ticket.optString("seat", "")
                val seatType = ticket.optString("seatType", "")
                val date = ticket.optString("date", "")
                val platform = ticket.optString("platform", "")
                val status = ticket.optString("status", "CONFIRMED")

                views.setViewVisibility(R.id.layout_active_ticket, View.VISIBLE)
                views.setViewVisibility(R.id.layout_no_ticket, View.GONE)

                // Status & Journey Date
                views.setTextViewText(R.id.text_widget_status, if (status.isNotEmpty()) status.uppercase() else "CONFIRMED")
                views.setTextViewText(R.id.text_journey_date, if (date.isNotEmpty()) date.uppercase() else "UPCOMING")

                // Train number & name
                views.setTextViewText(R.id.text_train_number, if (trainNumber.isNotEmpty()) trainNumber else "TRAIN")
                views.setTextViewText(R.id.text_train_name, if (trainName.isNotEmpty()) trainName else "Express Service")

                // Route & Timings (Spot A: Platform alongside boarding station)
                views.setTextViewText(R.id.text_departure_time, if (departure.isNotEmpty()) departure else "--:--")
                val fromStationText = if (platform.isNotEmpty()) {
                    val pfClean = if (platform.startsWith("PF", ignoreCase = true)) platform else "PF $platform"
                    "$from · $pfClean"
                } else {
                    if (from.isNotEmpty()) from else "DEP"
                }
                views.setTextViewText(R.id.text_from_station, fromStationText)
                views.setTextViewText(R.id.text_arrival_time, if (arrival.isNotEmpty()) arrival else "--:--")
                views.setTextViewText(R.id.text_to_station, if (to.isNotEmpty()) to else "ARR")

                // Coach & Seat Badges + Platform Badge (Spot B)
                views.setTextViewText(R.id.text_coach, if (coach.isNotEmpty()) "COACH $coach" else "COACH --")
                views.setTextViewText(R.id.text_seat, if (seat.isNotEmpty()) "SEAT $seat" else "SEAT --")

                if (platform.isNotEmpty()) {
                    val pfClean = if (platform.startsWith("PF", ignoreCase = true)) {
                        platform.trim()
                    } else {
                        "PF $platform"
                    }
                    views.setViewVisibility(R.id.badge_platform, View.VISIBLE)
                    views.setTextViewText(R.id.text_platform_badge, pfClean)
                } else {
                    views.setViewVisibility(R.id.badge_platform, View.GONE)
                }

                views.setTextViewText(R.id.text_class_type, if (seatType.isNotEmpty()) "$seatType · Berth" else "Confirmed Berth")

                // Stub Header & Ticket Counter
                val stubHeader = if (total > 1) {
                    "TICKET ${currentIndex + 1} OF $total · TAP TO FLIP"
                } else {
                    "PNR REFERENCE · DIGITAL BOARDING PASS"
                }
                views.setTextViewText(R.id.text_widget_pnr_label, stubHeader)

                // Full-width formatted PNR
                val formattedPnr = if (pnr.length == 10) {
                    "${pnr.substring(0, 4)}  ${pnr.substring(4, 7)}  ${pnr.substring(7)}"
                } else {
                    pnr
                }
                views.setTextViewText(R.id.text_widget_pnr, if (formattedPnr.isNotEmpty()) formattedPnr else "BOARDING PASS")

                // Click on Body -> Open NORA to this specific ticket
                val bodyIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("action_type", "OPEN_ACTIVE_TICKET")
                    putExtra("pnr", pnr)
                    putExtra("train_number", trainNumber)
                }
                val bodyPendingIntent = PendingIntent.getActivity(
                    context,
                    widgetId * 10 + currentIndex,
                    bodyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.layout_active_ticket_body, bodyPendingIntent)

                // Click on Stub: If multiple tickets, flip to next ticket! Otherwise open ticket
                if (total > 1) {
                    val flipIntent = Intent(context, ActiveTicketWidgetProvider::class.java).apply {
                        action = ACTION_FLIP_TICKET
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                    }
                    val flipPendingIntent = PendingIntent.getBroadcast(
                        context,
                        widgetId * 100 + currentIndex,
                        flipIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.layout_ticket_stub, flipPendingIntent)
                } else {
                    views.setOnClickPendingIntent(R.id.layout_ticket_stub, bodyPendingIntent)
                }

            } else {
                views.setViewVisibility(R.id.layout_active_ticket, View.GONE)
                views.setViewVisibility(R.id.layout_no_ticket, View.VISIBLE)
                views.setTextViewText(R.id.text_no_ticket_title, "No Active Train Ticket")
                views.setTextViewText(
                    R.id.text_no_ticket_subtitle,
                    "Bookings from IRCTC & redRail appear here automatically"
                )

                val emptyIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("action_type", "OPEN_WALLET")
                }
                val emptyPendingIntent = PendingIntent.getActivity(
                    context,
                    widgetId + 5000,
                    emptyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.layout_no_ticket, emptyPendingIntent)
            }

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
