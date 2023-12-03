const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var cors = require('cors');
require('dotenv').config()
const fileUpload = require('express-fileupload');
const app = express();
const port = process.env.PORT || 7000;

//  midleware
app.use(cors());
// express req.body undefined
app.use(express.json());
app.use(fileUpload());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3ftktcj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const database = client.db('doctorsPortal');
        const appointmentOptionCollection = database.collection('appointmentOptions');
        const bookingCollection = database.collection('bookings');
        const usersCollection = database.collection('Users');
        const doctorsCollection = database.collection('Doctors');

        // get bookings
        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;

            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();

            const bookingQuery = { appointmentDate: date };
            const alreadyBooked = await bookingCollection.find(bookingQuery).toArray();

            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment == option.name)
                const bookedSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                option.slots = remainingSlots

            })
            res.send(options)
        })

        app.get('/appointmentSpeciallty', async (req, res) => {
            const query = {};
            const result = await appointmentOptionCollection.find(query).project({ name: 1 }).toArray();
            res.send(result)

        })




        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings)
        })




        // booking post
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment,
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You have already booked on ${booking.appointmentDate}`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        })



        // users
        // check the user is that admin or not
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });

        })


        app.get('/users', async (req, res) => {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        app.put('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const option = { upset: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })


        // doctors

        app.get('/doctors', async (req, res) => {
            const query = {};
            const result = await doctorsCollection.find(query).toArray();
            res.send(result)
        })


        app.post('/doctors', async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;
            const specialty = req.body.specialty;

            const pic = req.files.image;
            const picData = pic.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');

            const doctor = {
                name,
                email,
                specialty,
                image: imageBuffer
            }

            const result = await doctorsCollection.insertOne(doctor);
            res.send(result)
        })


    } finally {
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Our Doctor is Run on')
})

app.listen(port, () => {
    console.log(`Our Doctors website run on Port: ${port}`)
})