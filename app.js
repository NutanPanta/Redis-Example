const express = require('express');
const redis = require('redis');
const axios = require('axios');

const app = express();

const client = redis.createClient();

client.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  await client.connect();
})();

app.get('/', (req, res, next) => {
  res.json({ status: 200, message: 'Redis Example Running' });
});

const getRepos = async (req, res, next) => {
  const { username } = req.params;
  try {
    const { status, data } = await axios.get(
      `https://api.github.com/users/${username}`
    );
    await saveToCache(username, data.public_repos);
    return res
      .status(status)
      .send(
        `<h2>User ${username} has ${data.public_repos} public repositories</h2>`
      );
  } catch (error) {
    console.log(error);
    if (!error.response)
      return res.status(500).json({ status: 'Error', message: error.message });
    const { status, statusText, data } = error.response;
    return res.status(status).json({
      status: statusText,
      message:
        status === 404
          ? `No User with username ${username} found`
          : data.message,
    });
  }
};

const saveToCache = async (key, value) => {
  return await client.setEx(key, 3600, JSON.stringify(value));
};

const cachedContent = async (req, res, next) => {
  const { username } = req.params;
  let cachedData = await client.get(username);
  if (cachedData) {
    return res
      .status(200)
      .send(`<h2>User ${username} has ${cachedData} public repositories</h2>`);
  }
  next();
};

app.get('/repos/:username', cachedContent, getRepos);

app.listen(8080, () => {
  console.log('Redis Example is running in port 8080');
});
