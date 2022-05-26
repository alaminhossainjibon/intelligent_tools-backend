const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.umtabeb.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unAuthorized' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('intelligent_tools').collection('products');
        const buyingCollection = client.db('intelligent_tools').collection('buying');
        const userCollection = client.db('intelligent_tools').collection('users');

        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        // API
        app.get('/buying', verifyJWT, async (req, res) => {
            const buyer = req.query.buyer;
            const decodedEmail = req.decoded.email;
            if (buyer === decodedEmail) {
                const query = { buyer: buyer };
                const buying = await buyingCollection.find(query).toArray();
                return res.send(buying);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' })
            }
        })

        app.post('/buying', async (req, res) => {
            const buying = req.body;
            const result = await buyingCollection.insertOne(buying);
            res.send(result);
        })


    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello intelligent tools');
});

app.listen(port, () => {
    console.log(`Intelligent App listening on port ${port}`);
});