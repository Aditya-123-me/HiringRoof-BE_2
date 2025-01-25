const mongoose = require("mongoose");

const SubcategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    skills: { type: [String], default: [] }
});

const skillSchema = new mongoose.Schema({
    mainCategory: { type: String, required: true },
    subcategories: { type: Map, of: SubcategorySchema, default: {} }
});


module.exports = mongoose.model("skill", skillSchema);
