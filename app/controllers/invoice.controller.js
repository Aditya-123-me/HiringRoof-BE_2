const PaymentModel = require("../models/payment.model");
const serviceModel = require("../models/service.model");
const Job = require("../models/job.model");
const User = require("../models/user.model");
const PDFDocument = require("pdfkit-table");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readFilePromise = promisify(fs.readFile);
const { imageUpload } = require("../util/googleDrive.util");


const generateInvoice = async (req, res) => {
    try {
        const { merchantTransactionId } = req.params;

        // 1. Fetch Payment Record from HiringRoof DB
        let paymentData = await PaymentModel.findOne({ merchantTransactionId })
            .populate("userId", "name email phone userType");

        if (!paymentData) {
            const serviceRecord = await serviceModel.findOne({ merchantTransactionId })
                .populate("userId", "name email phone userType");
            if (serviceRecord) {
                paymentData = {
                    userId: serviceRecord.userId,
                    email: serviceRecord.userId?.email || "",
                    merchantTransactionId: serviceRecord.merchantTransactionId,
                    type: "service",
                    amount: serviceRecord.totalAmount,
                    isPaymentSuccess: serviceRecord.isPaymentSuccess,
                    contentData: serviceRecord.serviceData,
                    createdAt: serviceRecord.createdAt,
                    save: async function() {
                        serviceRecord.invoiceURL = this.invoiceURL;
                        await serviceRecord.save();
                    }
                };
            }
        }

        if (!paymentData) {
            return res.status(404).json({ status: false, msg: "Payment record not found !!" });
        }

        // 2. Fetch associated Job or Service item details
        let itemDetails = {};
        if (paymentData.type === "jobPost") {
            const job = await Job.findOne({ merchantTransactionId });
            itemDetails = {
                category: "Job Posting / Addon",
                title: job?.title || paymentData?.contentData?.title || "Job Post Service",
                addonType: paymentData?.contentData?.addonType || "Standard Job Post"
            };
        } else if (paymentData.type === "service") {
            const service = await serviceModel.findOne({ merchantTransactionId });
            itemDetails = {
                category: "Addon / Custom Service",
                title: service?.serviceData?.name || paymentData?.contentData?.name || "HiringRoof Service Addon",
                date: service?.date || paymentData?.contentData?.date || "N/A"
            };
        } else {
            itemDetails = {
                category: paymentData.type || "General Payment",
                title: paymentData?.contentData?.name || paymentData?.contentData?.title || "HiringRoof Service Addon"
            };
        }

        const user = paymentData.userId || req.user || {};
        const amountInRs = paymentData.amount || (paymentData.responsePayload?.data?.amount ? paymentData.responsePayload.data.amount / 100 : 0);

        // 3. Prepare PDF Invoice Data
        const pdfInfo = {
            name: user.name || "Customer",
            email: paymentData.email || user.email || "N/A",
            phone: user.phone || "N/A",
            amount: `Rs. ${amountInRs}`,
            merchantTransactionId: paymentData.merchantTransactionId,
            transactionId: paymentData.responsePayload?.data?.transactionId || "N/A",
            paymentInstrument: paymentData.responsePayload?.data?.paymentInstrument?.type || "Online Payment",
            status: paymentData.isPaymentSuccess ? "SUCCESS" : "PENDING",
            date: new Date(paymentData.createdAt || Date.now()).toLocaleDateString()
        };

        // 4. Create PDF Document with PDFKit
        let doc = new PDFDocument({ margin: 30, size: "A4" });
        let buffers = [];
        doc.on("data", buffers.push.bind(buffers));

        // Temporary file path for cloud upload
        const tempFilePath = path.join(__dirname, `../../scratch/Invoice_${merchantTransactionId}.pdf`);
        doc.pipe(fs.createWriteStream(tempFilePath));

        // HiringRoof Brand PDF Options (#7a19c8 theme)
        const tableOptions = {
            title: { label: "HiringRoof", fontSize: 36, color: "#7a19c8", align: "center" },
            subtitle: { label: "HiringRoof Payment & Addon Invoice", fontSize: 20, color: "#333333", align: "center" },
            width: 535,
            x: 0,
            y: 0,
            divider: {
                header: { disabled: false, width: 2, opacity: 1 },
                horizontal: { disabled: false, width: 0.5, opacity: 0.5 },
            },
            padding: 4,
            columnSpacing: 10,
            hideHeader: true,
            minRowHeight: 6,
            prepareRow: (row, indexColumn, indexRow, rectRow) => {
                doc.font("Helvetica").fontSize(11);
                if (indexColumn === 0) {
                    doc.addBackground(rectRow, "#7a19c8", 0.15);
                    doc.font("Helvetica-Bold").fontSize(12);
                }
            },
        };

        // Invoice Table Content
        const tableData = {
            headers: ["Details", "Value"],
            rows: [
                ["Invoice Date", pdfInfo.date],
                ["Customer Name", pdfInfo.name],
                ["Customer Email", pdfInfo.email],
                ["Phone Number", pdfInfo.phone],
                ["Service Category", itemDetails.category],
                ["Item / Addon Title", itemDetails.title],
                ["Amount Paid", pdfInfo.amount],
                ["Payment Status", pdfInfo.status],
                ["Merchant Transaction ID", pdfInfo.merchantTransactionId],
                ["Transaction ID", pdfInfo.transactionId],
                ["Payment Mode", pdfInfo.paymentInstrument]
            ],
        };

        await doc.table(tableData, tableOptions);
        doc.end();

        // 5. On Stream End -> Upload to Storage & Send Email
        doc.on("end", async () => {
            try {
                const pdfBuffer = Buffer.concat(buffers);

                // Upload to Google Drive / Storage to get permanent invoiceURL
                try {
                    const localFileContent = await readFilePromise(tempFilePath);
                    const invoiceURL = await imageUpload(
                        localFileContent,
                        `${user._id || "user"}_${merchantTransactionId}_Invoice`,
                        "invoice"
                    );
                    paymentData.invoiceURL = invoiceURL;
                    await paymentData.save();

                    // Remove temporary local file
                    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                } catch (uploadErr) {
                    console.error("Storage upload warning:", uploadErr.message);
                }

                // Send Nodemailer Email
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER || "mondal.rohan15@gmail.com",
                        pass: process.env.EMAIL_PASS || "uezb fdul evsf bbwr",
                    },
                });

                const mailOptions = {
                    from: { name: "HiringRoof Billing", address: process.env.EMAIL_USER || "mondal.rohan15@gmail.com" },
                    to: pdfInfo.email,
                    subject: `HiringRoof Invoice - ${merchantTransactionId}`,
                    text: `Dear ${pdfInfo.name},\n\nThank you for choosing HiringRoof! Please find attached the invoice for your purchase of ${itemDetails.title}.\n\nTotal Amount: ${pdfInfo.amount}\nTransaction ID: ${pdfInfo.merchantTransactionId}\n\nBest regards,\nHiringRoof Team`,
                    attachments: [
                        {
                            filename: `HiringRoof-Invoice-${merchantTransactionId}.pdf`,
                            content: pdfBuffer,
                            contentType: "application/pdf"
                        }
                    ]
                };

                if (pdfInfo.email && pdfInfo.email !== "N/A") {
                    await transporter.sendMail(mailOptions);
                }

                if (!res.headersSent) {
                    return res.status(200).json({
                        status: true,
                        msg: "Invoice generated and sent successfully !!",
                        invoiceURL: paymentData.invoiceURL || "",
                        paymentData
                    });
                }
            } catch (err) {
                console.error("Error finalizing invoice email/storage:", err);
                if (!res.headersSent) {
                    return res.status(500).json({ status: false, msg: "Invoice generated but email sending failed", error: err.message });
                }
            }
        });

    } catch (error) {
        console.error("Invoice generation error:", error);
        if (!res.headersSent) {
            return res.status(500).json({ status: false, msg: "Error generating invoice", error: error.message });
        }
    }
};

module.exports = { generateInvoice };