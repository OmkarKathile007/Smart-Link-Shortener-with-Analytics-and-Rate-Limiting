import mongoose from "mongoose";
import dns from "node:dns";


dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {

    try{
        const conn=await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        process.exit(1);
    }

}

export default connectDB;