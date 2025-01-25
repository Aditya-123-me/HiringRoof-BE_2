// elastic.config.js

const { Client } = require('@elastic/elasticsearch');

const elasticConfig = {
  cloud: {
    id: 'c854df4e2e05419aa867d19cb936a911:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvJDcyNWRiOTFlODUxMDQxNTY5MDBiMDQ0NWRjMmQ5MmQ0JDNiNjQ2ZTZlOTFlNjRlN2ZhYzM1Yjk3ZmE5Y2NhNDhh',
  },
  auth: {
    apiKey: 'N2hvMUlvNEJsZTBlRUd0QnF0N3I6MlB1dVp5UVVSWS00Y3JGc2E5b2d1QQ==',
  },
};

const elasticClient = new Client(elasticConfig);

module.exports = elasticClient;
