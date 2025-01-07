const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
//without require dotenv env will not work
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//middlware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.t241ufd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    //await client.connect();

    const menuCollections = client.db("bisrtoDB").collection("menu");
    const reviewsCollections = client.db("bisrtoDB").collection("reviews");
    const cartCollections = client.db("bisrtoDB").collection("carts");
    const userCollections = client.db("bisrtoDB").collection("user");
    /*
    User related api
    */

    app.post('/user', async(req, res) => {
      const user = req.body;
      const result = await userCollections.insertOne(user)
      res.send(result)
    })

    //----------- Menu related api
    app.get("/menu", async (req, res) => {
      const result = await menuCollections.find().toArray();
      res.send(result);
    });

    //---------- Review related api
    app.get("/review", async (req, res) => {
      const result = await reviewsCollections.find().toArray();
      res.send(result);
    });

    //cart related api
    app.post("/cart", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollections.insertOne(cartItem);
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const query = { email : email}
      const result = await cartCollections.find(query).toArray();
      res.send(result);
    }); 

    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cartCollections.deleteOne(query)
      res.send(result);
    })


    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
