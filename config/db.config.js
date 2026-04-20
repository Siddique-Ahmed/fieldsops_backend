import mongoose from "mongoose";

const connectDB = async () => {
  try {
    let connection;

    connection = await mongoose.connect(process.env.MONGO_URI);

    if (connection.connection.readyState === 1) {
      console.log("MongoDB connected successfully");
    }

    return connection;
  } catch (error) {
    console.log(error);
  }
};


export default connectDB;