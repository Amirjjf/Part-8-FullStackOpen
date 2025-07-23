require('dotenv').config();
const { GraphQLError } = require('graphql');
const { ApolloServer } = require("@apollo/server");
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Author = require('./models/Author');
const Book = require('./models/Book');
const User = require('./models/User');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/use/ws');
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

const MONGODB_URI = process.env.DATABASE_URL;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
  });

const typeDefs = `
  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int!
  },
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]!
  },
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    bookCount: Int!
    authorCount: Int!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ): Book!
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`;

const resolvers = {
  Query: {
    allBooks: async (root, args) => {
      let filter = {};
      if (args.author) {
        const author = await Author.findOne({ name: args.author });
        if (!author) return [];
        filter.author = author._id;
      }
      if (args.genre) {
        filter.genres = { $in: [new RegExp(`^${args.genre}$`, 'i')] };
      }
      return Book.find(filter).populate('author');
    },
    allAuthors: async () => {
      return Author.find({});
    },
    bookCount: async () => Book.countDocuments(),
    authorCount: async () => Author.countDocuments(),
    me: (root, args, {currentUser}) => {
      return currentUser;
    },
  },
  Mutation: {
    addBook: async (root, args, {currentUser}) => {
      if (!currentUser) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      let author;
      try {
        author = await Author.findOne({ name: args.author });
        if (!author) {
          author = new Author({ name: args.author });
          await author.save();
        }
      } catch (error) {
        throw new GraphQLError('Author creation failed: ' + error.message, {
          extensions: { code: 'BAD_USER_INPUT', invalidArgs: args.author }
        });
      }
      try {
        const book = new Book({
          title: args.title,
          published: args.published,
          author: author._id,
          genres: args.genres,
        });
        await book.save();
        const populatedBook = await book.populate('author');
        
        console.log('Publishing book addition:', populatedBook);
        pubsub.publish('BOOK_ADDED', { bookAdded: populatedBook });
        
        return populatedBook;
      } catch (error) {
        throw new GraphQLError('Book creation failed: ' + error.message, {
          extensions: { code: 'BAD_USER_INPUT', invalidArgs: args }
        });
      }
    },
    editAuthor: async (root, args, {currentUser}) => {
      if (!currentUser) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const author = await Author.findOne({ name: args.name });
      if (!author) return null;
      author.born = args.setBornTo;
      try {
        await author.save();
        return author;
      } catch (error) {
        throw new GraphQLError('Author update failed: ' + error.message, {
          extensions: { code: 'BAD_USER_INPUT', invalidArgs: args }
        });
      }
    },
    createUser: async (root, args) => {
      try {
        const user = new User({ 
          username: args.username, 
          favoriteGenre: args.favoriteGenre 
        });
        await user.save();
        return user;
      } catch (error) {
        throw new GraphQLError('User creation failed: ' + error.message, {
          extensions: { code: 'BAD_USER_INPUT', invalidArgs: args }
        });
      }
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      
      // Hardcoded password check (all users have the same password)
      if (!user || args.password !== 'secret') {
        throw new GraphQLError('Wrong credentials', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, process.env.SECRET_KEY) };
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator('BOOK_ADDED')
    },
  },
  Author: {
    bookCount: async (root) => {
      return Book.countDocuments({ author: root._id });
    },
  },
  Book: {
    author: async (root) => {
      return Author.findById(root.author);
    },
  },
};

const start = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  console.log('WebSocket server created');

  const serverCleanup = useServer({ 
    schema,
    onConnect: (ctx) => {
      console.log('WebSocket client connected:', ctx.connectionParams);
    },
    onDisconnect: (ctx, code, reason) => {
      console.log('WebSocket client disconnected:', code, reason);
    },
  }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null;
        if (auth && auth.toLowerCase().startsWith('bearer ')) {
          const decodedToken = jwt.verify(auth.substring(7), process.env.SECRET_KEY);
          const currentUser = await User.findById(decodedToken.id);
          return { currentUser };
        }
        return {};
      },
    }),
  );

  const PORT = 4000;

  httpServer.listen(PORT, () =>
    console.log(`Server is now running on http://localhost:${PORT}`)
  );
};

start();
