const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();
const uri = process.env.MONGO_URI;
const app = express();
const port = process.env.PORT;

// midleware
app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const headers = req.headers.authorization;
  if (!headers) {
    return res.status(401).json({
      message: "unauthorized",
    });
  }
  const token = headers.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      message: "unauthorized",
    });
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    );
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }
};

async function run() {
  try {
    // await client.connect();

    // await client.db("admin").command({ ping: 1 });
    const db = client.db("wanderlustDB");
    const destinationsCollection = db.collection("destinations");
    const bookingsCollection = db.collection("bookings");

    app.post("/add-destination",verifyToken, async (req, res) => {
      const destination = req.body;
      const result = await destinationsCollection.insertOne(destination);
      res.json(result);
    });

    app.get("/destinations", async (req, res) => {
      const destinations = await destinationsCollection.find().toArray();
      res.json(destinations);
    });

    // middleware
    app.get("/destinations/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const destinationData = await destinationsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(destinationData);
    });

    // update
    app.patch("/destinations/:id", async (req, res) => {
      const id = req.params.id;
      const updatedDestination = req.body;
      const result = await destinationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedDestination },
      );
      res.send(result);
    });

    // delete
    app.delete("/destinations/:id", async (req, res) => {
      const id = req.params.id;
      const result = await destinationsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // booking post
    app.post("/bookings", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingsCollection.insertOne(bookingData);
      res.send(result);
    });

    app.get("/bookings/:userId", async (req, res) => {
      const userId = req.params.userId;
      const result = await bookingsCollection.find({ userId }).toArray();
      res.send(result);
    });

    app.delete("/bookings/:bookingId", async (req, res) => {
      const bookingId = req.params.bookingId;
      const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(bookingId),
      });
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is fine");
});

app.listen(port, () => {
  console.log("server is running");
});
