require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

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
    // await client.connect();

    const db = client.db("utility_db");
    const billsCollection = db.collection("bills");
    const usersCollection = db.collection("users");
    const paymentsCollection = db.collection("payments");

    // users APIs
    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;
        const email = req.body.email;
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }
        const query = { email: email };
        const existingUser = await usersCollection.findOne(query);
        if (existingUser) {
          return res
            .status(200)
            .send({ message: "User already exists", exists: true });
        }
        const result = await usersCollection.insertOne(newUser);
        res.status(201).send(result);
      } catch (err) {
        console.error("POST /users error:", err);
        res.status(500).send({ message: "Failed to create user" });
      }
    });

    // bills APIs
    app.get("/bills", async (req, res) => {
      try {
        const email = req.query.email;
        const category = req.query.category;
        const query = {};
        if (email) query.email = email;
        if (category) query.category = category;

        const result = await billsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.error("GET /bills error:", err);
        res.status(500).send({ message: "Failed to fetch bills" });
      }
    });

    // recent bill
    app.get("/recent-bills", async (req, res) => {
      try {
        const result = await billsCollection
          .find()
          .sort({ date: -1 })
          .limit(8)
          .toArray();
        res.send(result);
      } catch (err) {
        console.error("GET /recent-bills error:", err);
        res.status(500).send({ message: "Failed to fetch recent bills" });
      }
    });

    // get specific bill by id
    app.get("/bills/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await billsCollection.findOne(query);
        if (!result) {
          return res.status(404).send({ message: "Bill not found" });
        }
        res.send(result);
      } catch (err) {
        console.error("GET /bills/:id error:", err);
        res.status(500).send({ message: "Failed to fetch bill" });
      }
    });

    // post a bill
    app.post("/bills", async (req, res) => {
      try {
        const newBill = req.body;
        const result = await billsCollection.insertOne(newBill);
        res.status(201).send(result);
      } catch (err) {
        console.error("POST /bills error:", err);
        res.status(500).send({ message: "Failed to add bill" });
      }
    });

    // update a bill
    app.put("/bills/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedBill = req.body;
        delete updatedBill._id; // Remove _id from update data

        const result = await billsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedBill }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Bill not found" });
        }

        res.send({
          message: "Bill updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (err) {
        console.error("PUT /bills/:id error:", err);
        res.status(500).send({ message: "Failed to update bill" });
      }
    });

    // delete a bill
    app.delete("/bills/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await billsCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Bill not found" });
        }

        res.send({
          message: "Bill deleted successfully",
          deletedCount: result.deletedCount,
        });
      } catch (err) {
        console.error("DELETE /bills/:id error:", err);
        res.status(500).send({ message: "Failed to delete bill" });
      }
    });

    // API to save a payment
    app.post("/payments", async (req, res) => {
      try {
        const paymentInfo = req.body;
        paymentInfo.paymentDate = new Date();

        // 1. Insert payment
        const paymentResult = await paymentsCollection.insertOne(paymentInfo);

        // 2. Update bill status to "Paid" if billId exists
        if (paymentInfo.billId) {
          const billUpdateResult = await billsCollection.updateOne(
            { _id: new ObjectId(paymentInfo.billId) },
            { $set: { status: "Paid" } }
          );
          console.log(
            `Updated bill ${paymentInfo.billId} status to Paid. Modified: ${billUpdateResult.modifiedCount}`
          );
        }

        res.status(201).send(paymentResult);
      } catch (err) {
        console.error("POST /payments error:", err);
        res.status(500).send({ message: "Failed to save payment" });
      }
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
    // await client.db("admin").command({ ping: 1 });
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
