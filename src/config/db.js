const mongoose = require('mongoose');
require('dotenv/config')
const dns =require('dns')
dns.setServers(['1.1.1.1','8.8.8.8'])



const ConnectedDB = async () => {
    try {
        const uri = process.env.MONGO_URI ;
        await mongoose.connect(uri);
        console.log("Database connected");
    } catch (error) {
        console.error("Database connection error:", error.message);
        process.exit(1);
    }
}

module.exports = ConnectedDB;
