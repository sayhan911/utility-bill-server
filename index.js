const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://utility-bill:NeccX94TI5jxD1f2@cluster0.eoqyygq.mongodb.net/?appName=Cluster0";

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

    app.get("/bills", async (req, res) => {
      const cursor = billsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/bills/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await billsCollection.findOne(query);
      res.send(result);
    });

    app.post("/bills", async (req, res) => {
      const newBill = req.body;
      const result = await billsCollection.insertOne(newBill);
      res.send(result);
    });

    app.patch("/bills/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBill = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updatedBill.name,
          amount: updatedBill.amount,
        },
      };
      const result = await billsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/bills/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await billsCollection.deleteOne(query);
      res.send(result);
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
