require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set in the environment.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Utility Bill server is running");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("utility_db");
    const billsCollection = db.collection("bills");
    const usersCollection = db.collection("users");
    const paymentsCollection = db.collection("payments");

    // users APIs
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({ message: "User exists!" });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // bills APIs
    app.get("/bills", async (req, res) => {
      console.log(req.query);
      const email = req.query.email;
      const category = req.query.category;
      const query = {};
      if (email) {
        query.email = email;
      }
      if (category) {
        query.category = category;
      }
      const cursor = billsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // recent bill
    app.get("/recent-bills", async (req, res) => {
      const cursor = billsCollection.find().sort({ date: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get specific bill by id
    app.get("/bills/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await billsCollection.findOne(query);
      res.send(result);
    });

    // post a bill
    app.post("/bills", async (req, res) => {
      const newBill = req.body;
      const result = await billsCollection.insertOne(newBill);
      res.send(result);
    });

    // API to save a payment
    app.post("/payments", async (req, res) => {
      const paymentInfo = req.body;
      paymentInfo.paymentDate = new Date();
      const result = await paymentsCollection.insertOne(paymentInfo);
      res.send(result);
    });

    // API to get payments for a specific user
    app.get("/payments", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
      const query = { email: email };
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    });

    // Update payment
    app.patch("/payments/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updates = req.body;

        const allowed = {};
        if (updates.amount) allowed.amount = updates.amount;
        if (updates.Address) allowed.Address = updates.Address;
        if (updates.Phone) allowed.Phone = updates.Phone;
        if (updates.date) allowed.date = updates.date;

        const result = await paymentsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: allowed }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send("Payment not found");
        }

        const updated = await paymentsCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(updated);
      } catch (err) {
        console.error(err);
        res.status(500).send("Update failed");
      }
    });

    // Delete payment by id
    app.delete("/payments/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await paymentsCollection.deleteOne(query);
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Payment not found" });
        }
        res.send({ message: "Deleted", deletedId: id });
      } catch (err) {
        console.error("DELETE /payments/:id error:", err);
        res.status(500).send({ message: "Delete failed" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Utility Bill server is running on port ${port}`);
});
