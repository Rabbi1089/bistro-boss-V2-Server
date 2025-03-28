const express = require("express");
const app = express();
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
//without require dotenv env will not work
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.use(cors());
app.use(express.json());

//middlewares --------------

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
    console.log("from decoded", decoded);
  });
  next();
};

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
    const paymentCollections = client.db("bisrtoDB").collection("payment");
    /*
    Json web token related api
    */
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //verify admin , use verify admin after verify token

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      console.log("from verify admin middleware", email);
      const query = { email: email };
      const user = await userCollections.findOne(query);
      const isAdmin = user?.role === "admin";
      console.log("from is admin", isAdmin);
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    /*
    admin related api
    */
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollections.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/user", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });

    /*
    User related api
    */

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollections.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.delete("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    //----------- Menu related api -------------------
    app.get("/menu", async (req, res) => {
      const result = await menuCollections.find().toArray();
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollections.insertOne(item);
      res.send(result);
    });

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollections.deleteOne(query);
      res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      // Prepare query to match both formats
      const query = ObjectId.isValid(id)
        ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
        : { _id: id };
      // console.log("MongoDB Query:", query);
      // const query = { _id: new ObjectId(id) };
      const result = await menuCollections.findOne(query);
      res.send(result);
    });
    //If IDs appear as strings, do not use new ObjectId(id).

    app.patch("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const item = req.body;
      console.log(id, item);
      // Prepare query to match both formats
      const query = ObjectId.isValid(id)
        ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
        : { _id: id };
      const updatedDoc = {
        $set: {
          name: item.name,
          recipe: item.recipe,
          image: item.display_url,
          category: item.category,
          price: item.price,
        },
      };

      const result = await menuCollections.updateOne(query, updatedDoc);
      res.send(result);
      console.log(id, item, result);
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
    //----------------------------------------------stripe ----------------------------------*************
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount from intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ client_secret: paymentIntent.client_secret });
    });

    //************* Payment related api ************** */
    app.post("/payment", async (req, res) => {
      try {
        const payment = req.body;
        const paymentResult = await paymentCollections.insertOne(payment);
        console.log("payment Info", payment);
        console.log("payment result", paymentResult);
        const query = {
          _id: {
            $in: payment.cartIds.map((id) => new ObjectId(id)),
          },
        };
        const deleteResult = await cartCollections.deleteMany(query);
        console.log(deleteResult);

        res.send({ paymentResult, deleteResult });
      } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      console.log(query);
      if (req.params.email != req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollections.find(query).toArray();
      res.send(result);
    });

    //stats or analytics

    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollections.estimatedDocumentCount();
      const menuItems = await menuCollections.estimatedDocumentCount();
      const orders = await paymentCollections.estimatedDocumentCount();

      const payments = await paymentCollections.find().toArray();
      const revenues = payments.reduce(
        (total, payment) => total + Number(payment.price),
        0
      );

      const result = await paymentCollections
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$price",
              },
            },
          },
        ])
        .toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        menuItems,
        orders,
        revenue,
        revenues,
      });
    });

    app.get("/order-stats",verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollections
        .aggregate([
          {
            $unwind: "$menuItemIds",
          },
          {
            $lookup: {
              from: "menu",
              localField: "menuItemIds",
              foreignField: "_id",
              as: "menuItems",
            },
          },
          {
            $unwind: "$menuItems",
          },
          {
            $group: {
              _id: "$menuItems.category",
              quantity: { $sum: 1 },
              revenue: { $sum: "$menuItems.price" },
            },
          },
          {
            $project: {
              _id: 0,
              category: '$_id',
              quantity: '$quantity',
              revenue:'$revenue'
            }
          }
        ])
        .toArray();
      res.send(result);
    });

    /*
const stringPrices = await paymentCollections.find({ price: { $type: 'string' } }).toArray();
console.log(stringPrices);
*/

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
