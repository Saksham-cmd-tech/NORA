package dev.saksham.nora.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import dev.saksham.nora.MainActivity
import dev.saksham.nora.R
import kotlin.math.abs

object NoraNotificationHelper {

    const val CHANNEL_REMINDERS_ID = "nora_journey_reminders"
    const val CHANNEL_TICKET_DETECTED_ID = "nora_ticket_detected"
    const val CHANNEL_LIVE_JOURNEY_ID = "nora_live_journey"

    const val LIVE_JOURNEY_NOTIFICATION_ID = 50001

    private const val ACTION_NOTIFICATION_CLICK = "dev.saksham.nora.NOTIFICATION_ACTION"

    // Action types
    const val ACTION_VIEW_TICKET = "VIEW_TICKET"
    const val ACTION_TRAIN_STATUS = "TRAIN_STATUS"
    const val ACTION_SHARE_TRIP = "SHARE_TRIP"
    const val ACTION_CHECK_STATUS = "CHECK_STATUS"
    const val ACTION_COACH_POSITION = "COACH_POSITION"
    const val ACTION_DISMISS_LIVE_ACTIVITY = "DISMISS_LIVE_ACTIVITY"

    /**
     * Initializes notification channels required for Android 8.0 (API 26) and higher.
     */
    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Channel 1: Journey Reminders (2h and 1h alerts)
            val reminderChannel = NotificationChannel(
                CHANNEL_REMINDERS_ID,
                "Journey Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Pre-departure departure alerts 2 hours and 1 hour before journey"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 150, 300)
                lightColor = 0xFFF5332C.toInt()
                enableLights(true)
            }

            // Channel 2: Ticket Detection Alerts
            val detectedChannel = NotificationChannel(
                CHANNEL_TICKET_DETECTED_ID,
                "Ticket Detection",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts when new train tickets or bookings are detected"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 200, 100, 200)
                lightColor = 0xFFF5332C.toInt()
                enableLights(true)
            }

            // Channel 3: Live Journey Activity (Ongoing Lock Screen Widget)
            val liveJourneyChannel = NotificationChannel(
                CHANNEL_LIVE_JOURNEY_ID,
                "Live Journey Activity",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Persistent ongoing lock-screen updates for your active train journey"
                setShowBadge(false)
                enableLights(true)
                lightColor = 0xFFF5332C.toInt()
            }

            notificationManager.createNotificationChannel(reminderChannel)
            notificationManager.createNotificationChannel(detectedChannel)
            notificationManager.createNotificationChannel(liveJourneyChannel)
        }
    }

    private fun createActionPendingIntent(
        context: Context,
        actionType: String,
        pnr: String,
        trainNumber: String,
        requestCodeSeed: Int
    ): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = ACTION_NOTIFICATION_CLICK
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action_type", actionType)
            putExtra("pnr", pnr)
            putExtra("train_number", trainNumber)
        }

        val uniqueRequestCode = abs(requestCodeSeed * 37 + actionType.hashCode())
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getActivity(context, uniqueRequestCode, intent, flags)
    }

    /**
     * Displays a system notification when a ticket is detected from SMS / push / manual sync.
     * Customizes layout and contextual action buttons based on ticket booking status.
     */
    fun showTicketDetectedNotification(context: Context, ticketData: Bundle) {
        createNotificationChannels(context)

        val pnr = ticketData.getString("pnr", "").trim()
        val trainNumber = ticketData.getString("trainNumber", "").trim()
        val trainName = ticketData.getString("trainName", "Express").trim()
        val fromCode = ticketData.getString("fromCode", "").trim().uppercase()
        val toCode = ticketData.getString("toCode", "").trim().uppercase()
        val date = ticketData.getString("date", "").trim()
        val time = ticketData.getString("departure", "").trim()
        val coach = ticketData.getString("coach", "").trim()
        val seat = ticketData.getString("seat", "").trim()
        val rawStatus = ticketData.getString("status", "CONFIRMED").trim().uppercase()
        val platform = ticketData.getString("platform", "").trim()

        val pnrHash = abs(pnr.hashCode())
        val isChartPrepared = rawStatus.contains("CHART")
        val isWaitlistOrRac = rawStatus.contains("WL") || rawStatus.contains("WAIT") || rawStatus == "RAC"

        val title: String
        val bigText: String
        val subText = if (pnr.isNotEmpty()) "IRCTC Booking • PNR $pnr" else "IRCTC Booking"

        val contentPendingIntent = createActionPendingIntent(
            context,
            ACTION_VIEW_TICKET,
            pnr,
            trainNumber,
            pnrHash
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_TICKET_DETECTED_ID)
            .setSmallIcon(R.drawable.ic_notification_train)
            .setColor(0xFFF5332C.toInt())
            .setContentIntent(contentPendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)

        try {
            val appIconBitmap = BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
            if (appIconBitmap != null) {
                builder.setLargeIcon(appIconBitmap)
            }
        } catch (_: Exception) {}

        if (isChartPrepared) {
            // Case 1: Chart Prepared
            title = "📋 Chart Prepared: Train $trainNumber"
            val seatInfo = if (coach.isNotEmpty() && seat.isNotEmpty()) "Coach $coach • Seat $seat" else "Berth Confirmed"
            val platInfo = if (platform.isNotEmpty()) " • Platform $platform" else ""
            bigText = "$seatInfo$platInfo\n$trainNumber · $trainName\n$fromCode → $toCode\nCheck your coach position along the platform."

            builder.setContentTitle(title)
                .setContentText(seatInfo)
                .setSubText(subText)
                .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
                .addAction(
                    0,
                    "COACH POSITION",
                    createActionPendingIntent(context, ACTION_COACH_POSITION, pnr, trainNumber, pnrHash + 1)
                )
                .addAction(
                    0,
                    "VIEW TICKET",
                    createActionPendingIntent(context, ACTION_VIEW_TICKET, pnr, trainNumber, pnrHash + 2)
                )

        } else if (isWaitlistOrRac) {
            // Case 2: Waitlisted / RAC Ticket
            val displayStatus = if (rawStatus == "RAC") "RAC" else "Waitlisted"
            title = "⚠️ Ticket Detected ($displayStatus)"
            bigText = "$trainNumber · $trainName\n$fromCode → $toCode • $date\nBooking Status: $displayStatus • PNR: $pnr\nTap to monitor confirmation and chart status."

            builder.setContentTitle(title)
                .setContentText("$trainNumber $trainName • Status: $displayStatus")
                .setSubText(subText)
                .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
                .addAction(
                    0,
                    "CHECK STATUS",
                    createActionPendingIntent(context, ACTION_CHECK_STATUS, pnr, trainNumber, pnrHash + 1)
                )
                .addAction(
                    0,
                    "VIEW DETAILS",
                    createActionPendingIntent(context, ACTION_VIEW_TICKET, pnr, trainNumber, pnrHash + 2)
                )

        } else {
            // Case 3: Confirmed Ticket
            title = "🎟️ New Train Ticket Detected!"
            val timePart = if (time.isNotEmpty()) " • $time" else ""
            val coachSeat = if (coach.isNotEmpty() && seat.isNotEmpty()) "Coach $coach • Seat $seat" else "Confirmed"
            bigText = "$trainNumber · $trainName\n$fromCode → $toCode • $date$timePart\n$coachSeat • Status: Confirmed"

            builder.setContentTitle(title)
                .setContentText("$trainNumber $trainName • $coachSeat")
                .setSubText(subText)
                .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
                .addAction(
                    0,
                    "VIEW TICKET",
                    createActionPendingIntent(context, ACTION_VIEW_TICKET, pnr, trainNumber, pnrHash + 1)
                )
                .addAction(
                    0,
                    "TRAIN STATUS",
                    createActionPendingIntent(context, ACTION_TRAIN_STATUS, pnr, trainNumber, pnrHash + 2)
                )
                .addAction(
                    0,
                    "SHARE TRIP",
                    createActionPendingIntent(context, ACTION_SHARE_TRIP, pnr, trainNumber, pnrHash + 3)
                )
        }

        val notificationId = 10000 + (pnrHash % 89999)
        try {
            NotificationManagerCompat.from(context).notify(notificationId, builder.build())
        } catch (e: SecurityException) {
            // Android 13 POST_NOTIFICATIONS runtime permission might not be granted yet
        }
    }

    /**
     * Displays a system notification for pre-departure journey reminders (2h or 1h before departure).
     */
    fun showJourneyReminderNotification(
        context: Context,
        reminderType: String,
        ticketData: Bundle
    ) {
        createNotificationChannels(context)

        val pnr = ticketData.getString("pnr", "").trim()
        val trainNumber = ticketData.getString("trainNumber", "").trim()
        val trainName = ticketData.getString("trainName", "Express").trim()
        val fromCode = ticketData.getString("fromCode", "").trim().uppercase()
        val fromName = ticketData.getString("fromName", "").trim()
        val toCode = ticketData.getString("toCode", "").trim().uppercase()
        val toName = ticketData.getString("toName", "").trim()
        val departure = ticketData.getString("departure", "").trim()
        val coach = ticketData.getString("coach", "").trim()
        val seat = ticketData.getString("seat", "").trim()
        val platform = ticketData.getString("platform", "").trim()
        val pillar = ticketData.getString("pillar", "").trim()

        val isOneHour = reminderType.contains("1")
        val title = if (isOneHour) {
            "🚨 Train $trainNumber Departing in 1 Hour!"
        } else {
            "🚆 Train $trainNumber Departing in 2 Hours"
        }

        val pnrHash = abs(pnr.hashCode())
        val requestCodeBase = pnrHash + if (isOneHour) 50000 else 40000

        val routeText = if (fromName.isNotEmpty() && toName.isNotEmpty()) {
            "$fromCode ($fromName) → $toCode ($toName)"
        } else {
            "$fromCode → $toCode"
        }

        val platformText = when {
            platform.isNotEmpty() && pillar.isNotEmpty() -> "Platform $platform · Pillar #$pillar"
            platform.isNotEmpty() -> "Platform $platform"
            else -> "Check Station Display"
        }

        val coachSeatText = if (coach.isNotEmpty() && seat.isNotEmpty()) {
            "Coach $coach · Seat $seat"
        } else {
            "Confirmed Reservation"
        }

        val timeLine = if (departure.isNotEmpty()) "Departs at $departure • $platformText" else platformText
        val pnrLine = if (pnr.isNotEmpty()) " • PNR: $pnr" else ""

        val bigText = "$trainNumber · $trainName\n$routeText\n$timeLine\n$coachSeatText$pnrLine"
        val contentSummary = "$trainNumber $trainName • $coachSeatText • $platformText"

        val contentPendingIntent = createActionPendingIntent(
            context,
            ACTION_VIEW_TICKET,
            pnr,
            trainNumber,
            requestCodeBase
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_REMINDERS_ID)
            .setSmallIcon(R.drawable.ic_notification_train)
            .setColor(0xFFF5332C.toInt())
            .setContentTitle(title)
            .setContentText(contentSummary)
            .setSubText("Departure Reminder")
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setContentIntent(contentPendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .addAction(
                0,
                "VIEW TICKET",
                createActionPendingIntent(context, ACTION_VIEW_TICKET, pnr, trainNumber, requestCodeBase + 1)
            )
            .addAction(
                0,
                "TRAIN STATUS",
                createActionPendingIntent(context, ACTION_TRAIN_STATUS, pnr, trainNumber, requestCodeBase + 2)
            )
            .addAction(
                0,
                "SHARE TRIP",
                createActionPendingIntent(context, ACTION_SHARE_TRIP, pnr, trainNumber, requestCodeBase + 3)
            )

        try {
            val appIconBitmap = BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
            if (appIconBitmap != null) {
                builder.setLargeIcon(appIconBitmap)
            }
        } catch (_: Exception) {}

        val notificationId = if (isOneHour) {
            20000 + (pnrHash % 49999)
        } else {
            30000 + (pnrHash % 49999)
        }

        try {
            NotificationManagerCompat.from(context).notify(notificationId, builder.build())
        } catch (e: SecurityException) {
            // Android 13 POST_NOTIFICATIONS runtime permission might not be granted yet
        }
    }

    /**
     * Displays or updates the ongoing persistent lock-screen Live Activity notification.
     * Stays pinned to the status bar and lock screen without buzzing on updates.
     */
    fun showLiveJourneyNotification(
        context: Context,
        ticketData: Bundle,
        liveData: Bundle?
    ) {
        createNotificationChannels(context)

        val pnr = ticketData.getString("pnr", "").trim()
        val trainNumber = ticketData.getString("trainNumber", "").trim()
        val trainName = ticketData.getString("trainName", "Express").trim()
        val fromCode = ticketData.getString("fromCode", "").trim().uppercase()
        val fromName = ticketData.getString("fromName", "").trim()
        val toCode = ticketData.getString("toCode", "").trim().uppercase()
        val toName = ticketData.getString("toName", "").trim()
        val coach = ticketData.getString("coach", "").trim()
        val seat = ticketData.getString("seat", "").trim()
        val platform = ticketData.getString("platform", "").trim()
        val pillar = ticketData.getString("pillar", "").trim()

        // Extract live telemetry fields if available
        val statusBadgeText = liveData?.getString("statusBadgeText", "ON TIME") ?: "ON TIME"
        val nextStationCode = (liveData?.getString("nextStationCode") ?: toCode).uppercase()
        val nextStationName = liveData?.getString("nextStationName") ?: toName
        val nextStationTime = liveData?.getString("nextStationTime") ?: ticketData.getString("departure", "")
        val nextStationPlatform = liveData?.getString("nextStationPlatform", "2") ?: "2"
        val currentSpeed = liveData?.getString("currentSpeed", "Tracking") ?: "Tracking"

        val pnrHash = abs(pnr.hashCode())
        val seed = pnrHash + 60000

        val title = "🚆 $trainNumber $trainName · $statusBadgeText"
        val coachSeatText = if (coach.isNotEmpty() && seat.isNotEmpty()) "Coach $coach · Seat $seat" else "Seat Confirmed"
        val subText = "Live Journey · $coachSeatText"

        val nextStopText = when {
            nextStationName.isNotEmpty() && nextStationTime.isNotEmpty() ->
                "Next: $nextStationCode ($nextStationName) · Plat $nextStationPlatform · $nextStationTime"
            nextStationName.isNotEmpty() ->
                "Next: $nextStationCode ($nextStationName) · Plat $nextStationPlatform"
            else ->
                "Approaching $toCode · Plat $nextStationPlatform"
        }

        val platformPillar = when {
            platform.isNotEmpty() && pillar.isNotEmpty() -> " · Plat $platform · Pillar #$pillar"
            platform.isNotEmpty() -> " · Plat $platform"
            else -> ""
        }

        val bigText = StringBuilder().apply {
            append("🚆 $trainNumber · $trainName\n")
            if (fromName.isNotEmpty() && toName.isNotEmpty()) {
                append("$fromCode ($fromName) → $toCode ($toName)\n")
            } else {
                append("$fromCode → $toCode\n")
            }
            append("$coachSeatText$platformPillar\n")
            append("$nextStopText\n")
            append("Status: $statusBadgeText · Speed: $currentSpeed")
        }.toString()

        val contentPendingIntent = createActionPendingIntent(
            context,
            ACTION_TRAIN_STATUS,
            pnr,
            trainNumber,
            seed
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_LIVE_JOURNEY_ID)
            .setSmallIcon(R.drawable.ic_notification_train)
            .setColor(0xFFF5332C.toInt())
            .setContentTitle(title)
            .setContentText(nextStopText)
            .setSubText(subText)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setContentIntent(contentPendingIntent)
            .setOngoing(true) // Persistent ongoing lock-screen widget
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Visible on secure lock screen
            .setOnlyAlertOnce(true) // Silent on dynamic refresh updates
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(
                0,
                "LIVE STATUS",
                createActionPendingIntent(context, ACTION_TRAIN_STATUS, pnr, trainNumber, seed + 1)
            )
            .addAction(
                0,
                if (coach.isNotEmpty()) "COACH $coach" else "COACH POSITION",
                createActionPendingIntent(context, ACTION_COACH_POSITION, pnr, trainNumber, seed + 2)
            )
            .addAction(
                0,
                "DISMISS",
                createActionPendingIntent(context, ACTION_DISMISS_LIVE_ACTIVITY, pnr, trainNumber, seed + 3)
            )

        try {
            val appIconBitmap = BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
            if (appIconBitmap != null) {
                builder.setLargeIcon(appIconBitmap)
            }
        } catch (_: Exception) {}

        try {
            NotificationManagerCompat.from(context).notify(LIVE_JOURNEY_NOTIFICATION_ID, builder.build())
        } catch (e: SecurityException) {
            // Android 13 POST_NOTIFICATIONS runtime permission might not be granted yet
        }
    }

    /**
     * Cancels the ongoing Live Journey notification from lock screen and status bar.
     */
    fun dismissLiveJourneyNotification(context: Context) {
        try {
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(LIVE_JOURNEY_NOTIFICATION_ID)
        } catch (_: Exception) {}
    }
}
