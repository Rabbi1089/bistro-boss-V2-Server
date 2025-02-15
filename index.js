const express = require("express");
const app = express();
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
//without require dotenv env will not work
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.use(cors());
app.use(express.json());

    //middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({
          message: "Unauthorized access",
        });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        console.log('from decoded', decoded);
      });
      next();
    };

    //verify admin , use verify admin after verify token

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      console.log('from verify admin middleware' , email);
      const query = { email: email};
      const user = await userCollections.findOne(query);
      const isAdmin = user?.role === 'admin'
      if (isAdmin) {
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }


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
    Json web token related api
    */
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
       expiresIn: '1h' ,
      });
      res.send({ token });
    });


    /*
    admin related api
    */
   app.get('/users/admin/:email', verifyToken , async(req,res) => {
    const email = req.params.email;
    console.log(req.decoded.email);
    if (email !== req.decoded.email) {
      return res.status(403).send({message : 'unauthorized access'})
    }
    const query = { email: email}
    const user = await userCollections.findOne(query)
    let admin = false;
    if (user) {
      admin = user?.role === 'admin'
    }
    res.send({admin})
   })





    app.get("/user", verifyToken, async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });

    /*
    User related api
    */

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollections.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await userCollections.deleteOne(query);
      res.send(result);
    });
    app.post("/user", async (req, res) => {
      const user = req.body;
      /*Check if user already exists then insert it on db 

      */
      const query = { email: user.email };
      const existingUser = await userCollections.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      //
      const result = await userCollections.insertOne(user);
      res.send(result);
    });

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
      const query = { email: email };
      const result = await cartCollections.find(query).toArray();
      res.send(result);
    });

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cartCollections.deleteOne(query);
      res.send(result);
    });

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

//$iCi2K0s.q4)
