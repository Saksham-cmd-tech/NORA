package dev.saksham.nora.bridge

import android.content.Intent
import android.graphics.*
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

class NoraShareModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NoraShareModule"

    /**
     * Generates a high-resolution, pixel-perfect ticket card image and opens
     * the native Android share sheet with the image attached.
     */
    @ReactMethod
    fun shareTicketImage(ticketData: ReadableMap, promise: Promise) {
        try {
            val file = renderTicketBitmapToFile(ticketData)
            val uri = FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.fileprovider",
                file
            )

            val shareText = if (ticketData.hasKey("shareText")) {
                ticketData.getString("shareText") ?: ""
            } else {
                val trainNum = ticketData.getString("trainNumber") ?: "26101"
                val trainName = ticketData.getString("trainName") ?: "Ajni Vande Bharat Express"
                val pnr = ticketData.getString("pnr") ?: ""
                val coach = if (ticketData.hasKey("coach")) ticketData.getString("coach") ?: "C5" else "C5"
                val seat = if (ticketData.hasKey("seat")) ticketData.getString("seat") ?: "64" else "64"
                "$trainNum · $trainName\nCoach $coach\nSeat $seat\nPNR $pnr\nStatus · Confirmed"
            }

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_TEXT, shareText)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(intent, "Share Ticket").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val currentActivity = reactApplicationContext.currentActivity
            if (currentActivity != null) {
                currentActivity.startActivity(chooser)
            } else {
                reactApplicationContext.startActivity(chooser)
            }

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("filePath", file.absolutePath)
                putString("contentUri", uri.toString())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR_SHARING_TICKET_IMAGE", e.message, e)
        }
    }

    /**
     * Generates the ticket card image and returns its Base64 data for in-app preview.
     */
    @ReactMethod
    fun getTicketImageBase64(ticketData: ReadableMap, promise: Promise) {
        try {
            val bitmap = renderTicketBitmap(ticketData)
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            val byteArray = stream.toByteArray()
            val base64 = Base64.encodeToString(byteArray, Base64.NO_WRAP)
            promise.resolve("data:image/png;base64,$base64")
        } catch (e: Exception) {
            promise.reject("ERROR_GENERATING_BASE64", e.message, e)
        }
    }

    private fun renderTicketBitmapToFile(ticketData: ReadableMap): File {
        val pnr = if (ticketData.hasKey("pnr")) ticketData.getString("pnr") ?: "ticket" else "ticket"
        val bitmap = renderTicketBitmap(ticketData)
        val file = File(reactApplicationContext.cacheDir, "nora_ticket_${pnr}.png")
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            out.flush()
        }
        return file
    }

    private fun renderTicketBitmap(ticketData: ReadableMap): Bitmap {
        val width = 1200
        val height = 480
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Read ticket values with defaults
        val trainNumber = if (ticketData.hasKey("trainNumber")) ticketData.getString("trainNumber") ?: "26101" else "26101"
        val trainName = if (ticketData.hasKey("trainName")) ticketData.getString("trainName") ?: "Pune – Ajni" else "Pune – Ajni"
        val trainType = if (ticketData.hasKey("trainType")) ticketData.getString("trainType") ?: "VANDE BHARAT" else "VANDE BHARAT"
        val fromCode = if (ticketData.hasKey("fromCode")) ticketData.getString("fromCode") ?: "PUNE" else "PUNE"
        val fromTime = if (ticketData.hasKey("fromTime")) ticketData.getString("fromTime") ?: "06:15 AM" else "06:15 AM"
        val toCode = if (ticketData.hasKey("toCode")) ticketData.getString("toCode") ?: "BD" else "BD"
        val toTime = if (ticketData.hasKey("toTime")) ticketData.getString("toTime") ?: "01:50 PM" else "01:50 PM"
        val coach = if (ticketData.hasKey("coach")) ticketData.getString("coach") ?: "C5" else "C5"
        val seat = if (ticketData.hasKey("seat")) ticketData.getString("seat") ?: "64" else "64"
        val platform = if (ticketData.hasKey("platform")) ticketData.getString("platform") ?: "5" else "5"
        val pillar = if (ticketData.hasKey("pillar")) ticketData.getString("pillar") ?: "11" else "11"
        val pnr = if (ticketData.hasKey("pnr")) ticketData.getString("pnr") ?: "8354766445" else "8354766445"
        val status = if (ticketData.hasKey("status")) ticketData.getString("status") ?: "CNF" else "CNF"
        val isLive = if (ticketData.hasKey("isLive")) ticketData.getBoolean("isLive") else true

        val cardLeft = 24f
        val cardTop = 18f
        val cardRight = 1176f
        val cardBottom = 462f
        val cornerRadius = 32f

        // 1. Card Background
        val cardBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#151515")
            style = Paint.Style.FILL
        }
        val cardBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#2A2A2A")
            style = Paint.Style.STROKE
            strokeWidth = 2.5f
        }
        val cardRect = RectF(cardLeft, cardTop, cardRight, cardBottom)
        canvas.drawRoundRect(cardRect, cornerRadius, cornerRadius, cardBgPaint)
        canvas.drawRoundRect(cardRect, cornerRadius, cornerRadius, cardBorderPaint)

        // 2. Top Orange Accent Bar
        val topStripePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#F5332C")
            style = Paint.Style.FILL
        }
        canvas.drawRoundRect(RectF(cardLeft + 36f, cardTop + 4f, cardRight - 36f, cardTop + 10f), 3f, 3f, topStripePaint)

        // 3. Top Row: Train Type Badge, Train Name & Live Status
        // Train Type Badge
        val typeBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#38231C")
            style = Paint.Style.FILL
        }
        val typeTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#FFB399")
            textSize = 24f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            letterSpacing = 0.08f
        }
        val typeText = trainType.uppercase()
        val typeWidth = typeTextPaint.measureText(typeText)
        val typeBadgeRect = RectF(cardLeft + 36f, 54f, cardLeft + 36f + typeWidth + 32f, 96f)
        canvas.drawRoundRect(typeBadgeRect, 10f, 10f, typeBadgePaint)
        canvas.drawText(typeText, typeBadgeRect.left + 16f, 84f, typeTextPaint)

        // Train Number & Name
        val trainTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#EDE9DE")
            textSize = 34f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        val trainTitleText = "$trainNumber $trainName"
        canvas.drawText(trainTitleText, typeBadgeRect.right + 20f, 85f, trainTitlePaint)

        // Live / Status Badge on right
        val liveBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#12291E")
            style = Paint.Style.FILL
        }
        val liveTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#34D399")
            textSize = 25f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            letterSpacing = 0.06f
        }
        val liveDotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#34D399")
            style = Paint.Style.FILL
        }
        val statusText = if (isLive) "LIVE" else status.uppercase()
        val statusTextWidth = liveTextPaint.measureText(statusText)
        val liveBadgeWidth = statusTextWidth + 56f
        val liveBadgeRect = RectF(cardRight - 36f - liveBadgeWidth, 54f, cardRight - 36f, 96f)
        canvas.drawRoundRect(liveBadgeRect, 12f, 12f, liveBadgePaint)
        canvas.drawCircle(liveBadgeRect.left + 22f, 75f, 5.5f, liveDotPaint)
        canvas.drawText(statusText, liveBadgeRect.left + 36f, 84f, liveTextPaint)

        // 4. Middle Row: Station Codes, Times & Arrow
        // From Station Code & Time
        val codePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#FFFFFF")
            textSize = 68f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            letterSpacing = 0.04f
        }
        val fromTimePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#34D399")
            textSize = 38f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        val fromCodeX = cardLeft + 36f
        val fromCodeY = 196f
        canvas.drawText(fromCode, fromCodeX, fromCodeY, codePaint)
        val fromCodeWidth = codePaint.measureText(fromCode)
        canvas.drawText(fromTime, fromCodeX + fromCodeWidth + 24f, fromCodeY, fromTimePaint)
        val fromTimeWidth = fromTimePaint.measureText(fromTime)
        val leftBlockRight = fromCodeX + fromCodeWidth + 24f + fromTimeWidth

        // To Station Code & Time
        val toCodeWidth = codePaint.measureText(toCode)
        val toCodeX = cardRight - 36f - toCodeWidth
        val toTimePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#CCC8B9")
            textSize = 38f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        val toTimeWidth = toTimePaint.measureText(toTime)
        val toTimeX = toCodeX - toTimeWidth - 24f
        canvas.drawText(toTime, toTimeX, fromCodeY, toTimePaint)
        canvas.drawText(toCode, toCodeX, fromCodeY, codePaint)

        // Middle Dashed Line & Arrow
        val arrowStartX = leftBlockRight + 36f
        val arrowEndX = toTimeX - 36f
        val midX = (arrowStartX + arrowEndX) / 2f
        val midY = 186f

        val dashPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#444038")
            style = Paint.Style.STROKE
            strokeWidth = 3f
            pathEffect = DashPathEffect(floatArrayOf(12f, 8f), 0f)
        }
        canvas.drawLine(arrowStartX, midY, midX - 22f, midY, dashPaint)
        canvas.drawLine(midX + 22f, midY, arrowEndX, midY, dashPaint)

        val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#FFB399")
            textSize = 36f
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        canvas.drawText("→", midX, midY + 11f, arrowPaint)

        // 5. Perforation Divider Line with Semicircular Notches
        val notchY = 278f
        val notchRadius = 22f
        val notchPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#000000")
            style = Paint.Style.FILL
        }
        // Left & right cutouts
        canvas.drawCircle(cardLeft, notchY, notchRadius, notchPaint)
        canvas.drawCircle(cardRight, notchY, notchRadius, notchPaint)

        // Divider dashed line
        val perfPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#383630")
            style = Paint.Style.STROKE
            strokeWidth = 2.5f
            pathEffect = DashPathEffect(floatArrayOf(14f, 10f), 0f)
        }
        canvas.drawLine(cardLeft + notchRadius + 8f, notchY, cardRight - notchRadius - 8f, notchY, perfPaint)

        // 6. Bottom Row: Coach/Seat, Boarding Details, PNR & Status
        // Coach & Seat Scarlet Pill
        val seatBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#F5332C")
            style = Paint.Style.FILL
        }
        val seatTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#000000")
            textSize = 46f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val seatRect = RectF(cardLeft + 36f, 334f, cardLeft + 280f, 416f)
        canvas.drawRoundRect(seatRect, 18f, 18f, seatBgPaint)
        canvas.drawText("$coach • $seat", seatRect.centerX(), 391f, seatTextPaint)

        // Boarding Details in Center
        val boardingLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#8E8B82")
            textSize = 23f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            letterSpacing = 0.12f
            textAlign = Paint.Align.CENTER
        }
        val boardingValPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#EDE9DE")
            textSize = 38f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val boardCenterX = width / 2f
        canvas.drawText("BOARDING", boardCenterX, 355f, boardingLabelPaint)
        canvas.drawText("Plat $platform • #$pillar", boardCenterX, 403f, boardingValPaint)

        // PNR & Status on Right
        val pnrPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#FFB399")
            textSize = 42f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.RIGHT
        }
        val statusBottomPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#34D399")
            textSize = 30f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            letterSpacing = 0.08f
            textAlign = Paint.Align.RIGHT
        }
        val pnrRightX = cardRight - 36f
        canvas.drawText(pnr, pnrRightX, 362f, pnrPaint)
        canvas.drawText(status, pnrRightX, 404f, statusBottomPaint)

        return bitmap
    }
}
