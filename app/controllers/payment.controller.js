const Job = require("../models/job.model");
const axios = require("axios");
const sha256 = require("sha256");
const fs = require("fs");
const PDFDocument = require("pdfkit-table");
const nodemailer = require("nodemailer");
const { imageUpload } = require("../util/googleDrive.util");
const { Merchant_Id, API_Key_Value, API_Key_Index, payEndPoint, Host_URL, statusEndPoint } = require("../config/config");
const PaymentModel = require("../models/payment.model");
const serviceModel = require("../models/service.model");
const convertTo12HourFormat = require("../util/convertTo12HourFormat");

const paymentController = {};
const filePath = "./PDF/invoice.pdf";
const today = new Date().toISOString().split("T")[0];

const readFilePromise = (filePath) => {
	const bufferContent = {
		fieldname: "invoice",
		originalname: "invoice.pdf",
		encoding: "7bit",
		mimetype: "application/pdf",
	};
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, (err, data) => {
			if (err) reject(err);

			const bufferData = Buffer.from(data);
			bufferContent.buffer = bufferData;
			bufferContent.size = bufferData.length;
			resolve(bufferContent);
		});
	});
};
  
paymentController.jobPostPayment = async (req, res, io) => {
	try {
		const jobId = req.params.id;

		const jobData = await Job.findOne({ _id: jobId });

		if (!jobData) return res.status(404).send({ status: false, msg: error.message, data: [] });

		const merchantTransactionId = `PI${jobData._id}`;
		const amount = (jobData.addOn.price + (jobData.addOn.price * 2) / 100) * 100;

		const payload = {
			merchantId: Merchant_Id,
			merchantTransactionId: merchantTransactionId,
			merchantUserId: `MUID${jobData.userId}`,
			amount: amount,
			redirectUrl: `https://hiringroof.hansrajventures.com/payment-status?id=${merchantTransactionId}&type=jobPost`,
			redirectMode: "REDIRECT",
			mobileNumber: req.user.phone,
			paymentInstrument: {
				type: "PAY_PAGE",
			},
		};

		const paymentBody = {};
		paymentBody.userId = req.user._id;
		paymentBody.email = req.user.email;
		paymentBody.merchantTransactionId = merchantTransactionId;
		paymentBody.type = "jobPost"; 
		paymentBody.contentData = jobData;
		paymentBody.amount = amount / 100;
		paymentBody.paymentPayload = payload;

		await PaymentModel.create(paymentBody);

		jobData.merchantTransactionId = merchantTransactionId;
		await jobData.save();

		const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
		const base64EncodedPayload = bufferObj.toString("base64");
		const xVerify = sha256(base64EncodedPayload + payEndPoint + API_Key_Value) + "###" + API_Key_Index;

		const options = {
			method: "post",
			url: `${Host_URL}${payEndPoint}`,
			headers: {
				accept: "application/json",
				"Content-Type": "application/json",
				"X-VERIFY": xVerify,
			},
			data: {
				request: base64EncodedPayload,
			},
		};

		axios
			.request(options)
			.then(function (response) {
				const url = response.data.data.instrumentResponse.redirectInfo.url;
				res.status(200).send({
					status: true,
					data: url,
					msg: "Payment initiation success",
				});
			})
			.catch(function (error) {
				console.error(error);
				res.status(404).send({
					status: false,
					data: error,
					msg: "Payment initiation failed",
				});
			});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

paymentController.servicePayment = async (req, res, io) => {
	try {
		const rawDate = req.body.date;
		const rawTime = req.body.time;

		let dateVal = rawDate;
		let timeVal = "";

		if (!dateVal || dateVal.trim() === "") {
			dateVal = new Date().toISOString().split("T")[0];
		}

		if (!rawTime || rawTime.trim() === "") {
			const now = new Date();
			let hours = now.getHours();
			const minutes = now.getMinutes();
			const meridiem = hours >= 12 ? "PM" : "AM";
			hours = hours % 12 || 12;
			const hoursFormatted = hours < 10 ? "0" + hours : hours;
			const minutesFormatted = minutes < 10 ? "0" + minutes : minutes;
			timeVal = `${hoursFormatted}:${minutesFormatted} ${meridiem}`;
		} else {
			timeVal = convertTo12HourFormat(rawTime) || rawTime;
		}

		const bodyData = {};

		const GST = parseFloat(((req.body.serviceData?.amount * 2) / 100).toFixed(2));
		const totalAmount = parseFloat(((req.body.serviceData?.amount + GST) * 100).toFixed(2));

		bodyData.userId = req.user._id;
		bodyData.date = dateVal;
		bodyData.time = timeVal;
		bodyData.serviceData = req.body.serviceData;
		bodyData.totalAmount = totalAmount / 100;
		bodyData.note = req.body.note || req.body.desc || req.body.description || "";
		bodyData.description = req.body.description || req.body.desc || req.body.note || "";

		const currentDate = new Date(dateVal);
		currentDate.setDate(currentDate.getDate() + 1);
		const nextDate = currentDate.toISOString().split("T")[0];
		bodyData.expireDate = nextDate;

		const serviceData = await serviceModel.create(bodyData);

		const merchantTransactionId = `SI${serviceData._id}`;

		const payload = {
			merchantId: Merchant_Id,
			merchantTransactionId: merchantTransactionId,
			merchantUserId: `MUID${req.user._id}`,
			amount: totalAmount,
			redirectUrl: `https://hiringroof.hansrajventures.com/payment-status?id=${merchantTransactionId}&type=service`,
			redirectMode: "REDIRECT",
			mobileNumber: req.user.phone,
			paymentInstrument: {
				type: "PAY_PAGE",
			},
		};

		const paymentBody = {};
		paymentBody.userId = req.user._id;
		paymentBody.email = req.user.email;
		paymentBody.merchantTransactionId = merchantTransactionId;
		paymentBody.type = "service";
		paymentBody.contentData = serviceData;
		paymentBody.amount = totalAmount / 100;
		paymentBody.paymentPayload = payload;

		await PaymentModel.create(paymentBody);

		serviceData.merchantTransactionId = merchantTransactionId;
		await serviceData.save();

		const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
		const base64EncodedPayload = bufferObj.toString("base64");
		const xVerify = sha256(base64EncodedPayload + payEndPoint + API_Key_Value) + "###" + API_Key_Index;

		const options = {
			method: "post",
			url: `${Host_URL}${payEndPoint}`,
			headers: {
				accept: "application/json",
				"Content-Type": "application/json",
				"X-VERIFY": xVerify,
			},
			data: {
				request: base64EncodedPayload,
			},
		};

		axios
			.request(options)
			.then(function (response) {
				const url = response.data.data.instrumentResponse.redirectInfo.url;
				res.status(200).send({
					status: true,
					data: url,
					msg: "Payment initiation success",
				});
			})
			.catch(function (error) {
				console.error(payload);
				res.status(404).send({
					status: false,
					data: error,
					msg: "Payment initiation failed",
				});
			});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

paymentController.status = async (req, res) => {
	try {
		const { merchantTransactionId } = req.params;

		const paymentData = await PaymentModel.findOne({ merchantTransactionId: merchantTransactionId }).populate("userId");

		let modelData = null;
		if (paymentData.type === "jobPost")
			modelData = await Job.findOne({ merchantTransactionId: merchantTransactionId }).populate({
				path: "userId",
				select: "name email phone profileImage userType",
			});
		if (paymentData.type === "service")
			modelData = await serviceModel.findOne({ merchantTransactionId: merchantTransactionId }).populate({
				path: "userId",
				select: "name email phone profileImage userType",
			});

		const url = `${Host_URL}${statusEndPoint}/${Merchant_Id}/${merchantTransactionId}`;
		const xVerify =
			sha256(`${statusEndPoint}/${Merchant_Id}/${merchantTransactionId}` + API_Key_Value) + "###" + API_Key_Index;

		const options = {
			method: "get",
			url: url,
			headers: {
				accept: "application/json",
				"Content-Type": "application/json",
				"X-MERCHANT-ID": Merchant_Id,
				"X-VERIFY": xVerify,
			},
		};
		const { data } = await axios.request(options);

		paymentData.responsePayload = data;

		if (paymentData.responsePayload.code === "PAYMENT_SUCCESS") {
			if (modelData) modelData.isPaymentSuccess = true;
			paymentData.isPaymentSuccess = true;
		}
		if (modelData) await modelData.save();

		const pdfData = {
			name: req.user.name,
			email: paymentData.email,
			number: req.user.phone,
			amount: paymentData?.responsePayload?.data?.amount / 100,
			merchantId: paymentData?.responsePayload?.data?.merchantId,
			merchantTransactionId: paymentData?.responsePayload?.data?.merchantTransactionId,
			transactionId: paymentData?.responsePayload?.data?.transactionId,
			paymentInstrument: paymentData?.responsePayload?.data?.paymentInstrument?.type,
			accountType: paymentData?.responsePayload?.data?.paymentInstrument?.accountType,
			upiTransactionId: paymentData?.responsePayload?.data?.paymentInstrument?.upiTransactionId,
			cardType: paymentData?.responsePayload?.data?.paymentInstrument?.cardType,
			pgTransactionId: paymentData?.responsePayload?.data?.paymentInstrument?.pgTransactionId,
			state: paymentData?.responsePayload?.data?.state,
		};

		let doc = new PDFDocument({ margin: 30, size: "A4" });
		doc.pipe(fs.createWriteStream(filePath));

		const option = {
			title: { label: "HiringRoof", fontSize: 40, color: "#7a19c8", align: "center" },
			subtitle: { label: "HiringRoof Payment Invoice", fontSize: 25, color: "#000", align: "center" },
			width: 535,
			x: 0,
			y: 0,
			divider: {
				header: { disabled: false, width: 2, opacity: 1 },
				horizontal: { disabled: false, width: 0.5, opacity: 0.5 },
			},
			padding: 2,
			columnSpacing: 10,
			hideHeader: true,
			minRowHeight: 5,
			prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
				doc.font("Helvetica").fontSize(13);
				indexColumn === 0 && doc.addBackground(rectRow, "#7a19c8", 0.5);
				indexColumn === 0 && doc.font("Helvetica").fontSize(15);
			},
		};

		const tableArray = {
			headers: ["Key", "Value"],
			rows: [
				["Name", pdfData?.name],
				["Email", pdfData?.email],
				["Number", pdfData?.number],
				["Amount (Rs)", pdfData?.amount],
				["Merchant Id", pdfData?.merchantId],
				["Merchant Transaction Id", pdfData?.merchantTransactionId],
				["Transaction Id", pdfData?.transactionId],
				["Payment Instrument", pdfData?.paymentInstrument],
				["Account Type", pdfData?.accountType],
				["UPI Transaction Id", pdfData?.upiTransactionId],
				["Card Type", pdfData?.cardType],
				["PG Transaction Id", pdfData?.pgTransactionId],
				["State", pdfData?.state],
			],
		};
		await doc.table(tableArray, option);
		doc.end();

		const invoiceURL = await imageUpload(
			await readFilePromise(filePath),
			`${req.user._id}_${merchantTransactionId}_jobPostInvoice`,
			"invoice"
		);

		paymentData.invoiceURL = invoiceURL;
		await paymentData.save();

		const transporter = nodemailer.createTransport({
			port: 587,
			host: "smtp.gmail.com",
			auth: {
				user: "mondal.rohan15@gmail.com",
				pass: "uezb fdul evsf bbwr",
			},
		});

		const mailDataUser = {
			from: "mondal.rohan15@gmail.com",
			to: pdfData.email,
			subject: "HiringRoof Payment Invoice",
			html: `Dear ${pdfData.name}, <br><br>

        Thank you for reaching out to our support team. We have received your inquiry through the support form, and we appreciate the opportunity to assist you. <br><br>

        Best regards,<br>

       HiringRoof`,
			attachments: [
				{
					filename: "Invoice.pdf",
					content: fs.createReadStream(filePath),
				},
			],
		};

		transporter.sendMail(mailDataUser, function (error, info) {
			if (error) {
				console.error("Error sending email:");
				return;
			}
			console.log("Email sent to User");
			transporter.close();
		});

		res.status(200).send({
			status: true,
			paymentData,
			data: modelData ? modelData : {},
			msg: "Payment initiation status",
		});
	} catch (error) {
		console.log(error);
		res.status(500).send({ status: false, data: {}, msg: error.message });
	}
};

paymentController.manualServicePayment = async (req, res) => {
	try {
		const rawDate = req.body.date;
		const rawTime = req.body.time;
		let serviceData = req.body.serviceData;

		if (typeof serviceData === "string") {
			try {
				serviceData = JSON.parse(serviceData);
			} catch (e) {}
		}

		if (!serviceData || (!serviceData.name && !serviceData.title)) return res.status(400).json({ status: false, msg: "Service details are required!" });
		if (!req.file) return res.status(400).json({ status: false, msg: "Please upload payment screenshot proof!" });

		let dateVal = rawDate;
		let timeVal = "";

		if (!dateVal || dateVal.trim() === "") {
			dateVal = new Date().toISOString().split("T")[0];
		}

		if (!rawTime || rawTime.trim() === "") {
			const now = new Date();
			let hours = now.getHours();
			const minutes = now.getMinutes();
			const meridiem = hours >= 12 ? "PM" : "AM";
			hours = hours % 12 || 12;
			const hoursFormatted = hours < 10 ? "0" + hours : hours;
			const minutesFormatted = minutes < 10 ? "0" + minutes : minutes;
			timeVal = `${hoursFormatted}:${minutesFormatted} ${meridiem}`;
		} else {
			timeVal = convertTo12HourFormat(rawTime) || rawTime;
		}

		const screenshotUrl = await imageUpload(req.file, `${req.user._id}_payment_proof_${Date.now()}`, "paymentProof");
		if (!screenshotUrl) return res.status(500).json({ status: false, msg: "Failed to upload payment screenshot!" });

		const GST = parseFloat(((serviceData.amount * 2) / 100).toFixed(2));
		const totalAmount = parseFloat((serviceData.amount + GST).toFixed(2));

		const currentDate = new Date(dateVal);
		currentDate.setMonth(currentDate.getMonth() + 1);
		const expireDate = currentDate.toISOString().split("T")[0];

		let merchantTransactionId = `MANUAL_${Date.now()}`;
		if (serviceData.type === "jobPostAddon" && serviceData.jobId) {
			merchantTransactionId = `MANUAL_JOB_ADDON_${serviceData.jobId}`;

			// Update the job to link this transaction ID
			const Job = require("../models/job.model");
			await Job.findByIdAndUpdate(serviceData.jobId, { merchantTransactionId });
		}

		const serviceRecord = await serviceModel.create({
			userId: req.user._id,
			addonId: req.body.addonId || serviceData._id || serviceData.id || null,
			date: dateVal,
			expireDate,
			time: timeVal,
			totalAmount,
			serviceData,
			merchantTransactionId,
			isPaymentSuccess: false,
			isActive: false,
			paymentScreenshot: screenshotUrl,
			paymentStatus: "PENDING",
			note: req.body.note || req.body.desc || req.body.description || "",
			description: req.body.description || req.body.desc || req.body.note || "",
		});

		return res.status(200).json({
			status: true,
			msg: "Payment details submitted successfully! Pending verification by Super Admin.",
			data: serviceRecord,
		});
	} catch (error) {
		console.error("Error in manualServicePayment:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = paymentController;
