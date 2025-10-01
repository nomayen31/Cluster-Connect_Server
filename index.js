const express = require('express');
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();
const { ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8k7klrr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const ClusterConnect = client.db("ClusterConnect");
    const ClusterConnectCollection = ClusterConnect.collection("taskess");

    // Route to add a new task
    app.post('/add-task', async (req, res) => {
      const NewTask = req.body;
      console.log('NewTask', NewTask);
      const result = await ClusterConnectCollection.insertOne(NewTask);
      res.send(result);
    });

    // Route to browse all tasks
    app.get('/browse-tasks', async (req, res) => {
      try {
        const tasks = await ClusterConnectCollection.find({}).toArray();
        res.json(tasks);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).send('Error fetching tasks');
      }
    });

    // Route to get a specific task by ID
    app.get('/browse-tasks/:id', async (req, res) => {
      const { id } = req.params;
      try {
        if (!ObjectId.isValid(id)) {
          return res.status(400).send('Invalid task ID');
        }
        const task = await ClusterConnectCollection.findOne({ _id: new ObjectId(id) });
        if (!task) {
          return res.status(404).send('Task not found');
        }
        res.json(task);
      } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching task details');
      }
    });

    // Route to get featured tasks
    app.get('/featured-tasks', async (req, res) => {
      try {
        const featuredTasks = await ClusterConnectCollection.find().sort({ deadline: 1 }).limit(6).toArray();
        res.json(featuredTasks);
      } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching featured tasks');
      }
    });

    // Route to get tasks posted by a specific user
    app.get('/my-posted-task', async (req, res) => {
      const { userEmail } = req.query;
      if (!userEmail) return res.status(400).send('Missing user email');

      const tasks = await ClusterConnectCollection.find({ userEmail }).sort({ deadline: -1 }).toArray();
      res.json(tasks);
    });

    // Server Code Adjustment
    // Endpoint to increment bid count for a task
    app.post('/tasks/:id/bid', async (req, res) => {
      const { id } = req.params;
      try {
        // ... (Your ID validation code) ...

        // Increment bids count by 1 using findOneAndUpdate
        const updateResult = await ClusterConnectCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { bids: 1 } },
          { returnDocument: 'after' } // Returns the document after the update
        );

        if (!updateResult.value) { // Check the returned value property
          return res.status(404).send('Task not found');
        }

        // ✅ Solution: Convert the MongoDB document value to a plain JavaScript object
        // This often ensures that the ObjectId is correctly handled (e.g., converted to a string)
        // before Express attempts to send it as JSON.
        const updatedTask = { ...updateResult.value };

        res.json(updatedTask); // Return the updated task with the new bid count

      } catch (err) {
        console.error(err);
        res.status(500).send('Error placing bid');
      }
    });
    // Backend route to get the number of bids for a task
    app.get('/tasks/:id/bids', async (req, res) => {
      const { id } = req.params;
      try {
        const task = await ClusterConnectCollection.findOne({ _id: new ObjectId(id) });
        if (!task) {
          return res.status(404).send('Task not found');
        }
        res.json({ bids: task.bids }); // Assuming `bids` stores the number of bids
      } catch (err) {
        res.status(500).send('Error fetching bids');
      }
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // Ensure that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

// Default route
app.get("/", (req, res) => {
  res.send("Cluster Connect Server Home page");
});

app.listen(port, () => {
  console.log(`Cluster Connect server is running on port ${port}`);
});
