package com.nora.wallet.widget

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.nora.wallet.R
import org.json.JSONArray
import org.json.JSONObject

class ActiveTicketWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return ActiveTicketRemoteViewsFactory(this.applicationContext, intent)
    }
}

class ActiveTicketRemoteViewsFactory(
    private val context: Context,
    private val intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private val tickets = mutableListOf<JSONObject>()

    override fun onCreate() {
        loadTickets()
    }

    override fun onDataSetChanged() {
        loadTickets()
    }

    private fun loadTickets() {
        tickets.clear()
        val prefs = context.getSharedPreferences(ActiveTicketWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
        val jsonString = prefs.getString(ActiveTicketWidgetProvider.KEY_ACTIVE_TICKET, null) ?: return
        try {
            val root = JSONObject(jsonString)
            if (root.optBoolean("hasTicket", false)) {
                val ticketsArray = root.optJSONArray("tickets")
                if (ticketsArray != null && ticketsArray.length() > 0) {
                    for (i in 0 until ticketsArray.length()) {
                        tickets.add(ticketsArray.getJSONObject(i))
                    }
                } else {
                    // Single ticket payload
                    tickets.add(root)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        tickets.clear()
    }

    override fun getCount(): Int = tickets.size

    override fun getViewAt(position: Int): RemoteViews? {
        if (position < 0 || position >= tickets.size) return null
        val item = tickets[position]
        val views = RemoteViews(context.packageName, R.layout.widget_ticket_item)

        val pnr = item.optString("pnr", "")
        val trainNumber = item.optString("trainNumber", "")
        val trainName = item.optString("trainName", "")
        val from = item.optString("from", "")
        val to = item.optString("to", "")
        val departure = item.optString("departure", "--:--")
        val arrival = item.optString("arrival", "--:--")
        val coach = item.optString("coach", "")
        val seat = item.optString("seat", "")
        val seatType = item.optString("seatType", "")
        val date = item.optString("date", "")
        val platform = item.optString("platform", "")
        val status = item.optString("status", "CONFIRMED")

        // Status & Journey Date
        views.setTextViewText(R.id.text_widget_status, if (status.isNotEmpty()) status.uppercase() else "CONFIRMED")
        views.setTextViewText(R.id.text_journey_date, if (date.isNotEmpty()) date.uppercase() else "UPCOMING")

        // Train number & name
        views.setTextViewText(R.id.text_train_number, if (trainNumber.isNotEmpty()) trainNumber else "TRAIN")
        views.setTextViewText(R.id.text_train_name, if (trainName.isNotEmpty()) trainName else "Express Service")

        // Route & Timings (Spot A: Platform next to boarding station)
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

        // Coach & Seat Badges
        views.setTextViewText(R.id.text_coach, if (coach.isNotEmpty()) "COACH $coach" else "COACH --")
        views.setTextViewText(R.id.text_seat, if (seat.isNotEmpty()) "SEAT $seat" else "SEAT --")
        views.setTextViewText(R.id.text_class_type, if (seatType.isNotEmpty()) "$seatType · Berth" else "Confirmed Berth")

        // Ticket Counter Header on Stub if multiple tickets
        val total = tickets.size
        val stubHeader = if (total > 1) {
            "TICKET ${position + 1} OF $total · PNR REFERENCE"
        } else {
            "PNR REFERENCE · DIGITAL BOARDING PASS"
        }
        views.setTextViewText(R.id.text_widget_pnr_label, stubHeader)

        // Full-width formatted PNR (no barcode)
        val formattedPnr = if (pnr.length == 10) {
            "${pnr.substring(0, 4)}  ${pnr.substring(4, 7)}  ${pnr.substring(7)}"
        } else {
            pnr
        }
        views.setTextViewText(R.id.text_widget_pnr, if (formattedPnr.isNotEmpty()) formattedPnr else "BOARDING PASS")

        // Click Fill-In Intent to open NORA to this specific ticket
        val fillInIntent = Intent().apply {
            putExtra("action_type", "OPEN_ACTIVE_TICKET")
            putExtra("pnr", pnr)
            putExtra("train_number", trainNumber)
        }
        views.setOnClickFillInIntent(R.id.ticket_card_root, fillInIntent)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
