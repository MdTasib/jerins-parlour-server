const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.Payment_Secket_Key);
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
	res.send("Jerin Parlour server is open");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dryxz.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
});

async function run() {
	try {
		await client.connect();
		const serviceCollection = client
			.db("jerins-parlour")
			.collection("services");
		const bookingCollection = client.db("jerins-parlour").collection("booking");
		const paymentCollection = client
			.db("jerins-parlour")
			.collection("payments");
		const reviewCollection = client.db("jerins-parlour").collection("review");

		// payment system
		app.post("/create-payment-intent", async (req, res) => {
			const service = req.body;
			const price = service.price;
			const amount = price * 100;
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: "usd",
				payment_method_types: ["card"],
			});
			res.send({ clientSecret: paymentIntent.client_secret });
		});

		// payment confirm
		app.patch("/payment/:id", async (req, res) => {
			const id = req.params.id;
			const payment = req.body;
			const filter = { _id: ObjectId(id) };
			const updatedDoc = {
				$set: {
					productId: payment.productId,
					status: payment.status,
					name: payment.name,
					description: payment.description,
					img: payment.img,
					paid: true,
					transactionId: payment.transactionId,
				},
			};

			const result = await paymentCollection.insertOne(payment);
			const updatedBooking = await bookingCollection.updateOne(
				filter,
				updatedDoc
			);
			res.send(updatedDoc);
		});

		// get all services
		app.get("/service", async (req, res) => {
			const service = await serviceCollection.find().toArray();
			res.send(service);
		});

		// get specific service
		app.get("/service/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await serviceCollection.findOne(query);
			res.send(result);
		});

		// booking a service
		app.post("/booking", async (req, res) => {
			const service = req.body;
			const result = await bookingCollection.insertOne(service);
			res.send(result);
		});

		// get booking on specific user
		app.get("/booking/:email", async (req, res) => {
			const email = req.params.email;
			const filter = { userEmail: email };
			const booking = await bookingCollection.find(filter).toArray();
			res.send(booking);
		});

		// get purchase on specific id
		app.get("/purchase/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const purchase = await bookingCollection.find(query).toArray();
			res.send(purchase);
		});

		// post a review
		app.post("/review", async (req, res) => {
			const review = req.body;
			const result = await reviewCollection.insertOne(review);
			res.send(result);
		});

		// get all review
		app.get("/review", async (req, res) => {
			const review = await reviewCollection.find().toArray();
			res.send(review);
		});
	} finally {
	}
}

run().catch(console.dir);

app.listen(port, () => console.log("Jerin Parlour server is open"));
