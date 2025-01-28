const mongoose = require("mongoose");

const addClientFormSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    website: { type: String, required: false },
}, { timestamps: true });

const AddClientForm = mongoose.model('AddClientForm', addClientFormSchema);

module.exports = AddClientForm;
