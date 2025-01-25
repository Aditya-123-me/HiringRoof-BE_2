const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } = require("firebase/storage");
const {
	FIREBASE_apiKey,
	FIREBASE_authDomain,
	FIREBASE_projectId,
	FIREBASE_storageBucket,
	FIREBASE_messagingSenderId,
	FIREBASE_appId,
	FIREBASE_measurementId,
} = require("../config/config");

const firebaseConfig = {
	apiKey: FIREBASE_apiKey,
	authDomain: FIREBASE_authDomain,
	projectId: FIREBASE_projectId,
	storageBucket: FIREBASE_storageBucket,
	messagingSenderId: FIREBASE_messagingSenderId,
	appId: FIREBASE_appId,
	measurementId: FIREBASE_measurementId,
};

initializeApp(firebaseConfig);

const storage = getStorage();

const imageUpload = async (imageData, name, folderName) => {
	const storageRef = ref(storage, `${folderName}/${name}.${imageData.originalname.split(".").pop()}`);
	const metaData = { contentType: imageData.mimetype };
	const snapShot = await uploadBytesResumable(storageRef, imageData.buffer, metaData);
	const downloadUrl = await getDownloadURL(snapShot.ref);
	return downloadUrl;
};

const deleteFromFirebase = async (url) => {
	try {
		const desertRef = ref(storage, url);
		await deleteObject(desertRef);
		return true;
	} catch (error) {
		return false;
	}
};

module.exports = { imageUpload, deleteFromFirebase };
