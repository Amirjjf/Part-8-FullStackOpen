import { gql, useQuery } from '@apollo/client'

const GET_USER = gql`
  query {
    me {
      favoriteGenre
    }
  }
`;

const GET_BOOKS_BY_GENRE = gql`
  query GetBooksByGenre($genre: String) {
    allBooks(genre: $genre) {
      title
      author {
        name
      }
      published
      genres
      id
    }
  }
`;

const Recommended = () => {
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER);
  const { data: booksData, loading: booksLoading, error: booksError } = useQuery(GET_BOOKS_BY_GENRE, {
    variables: { genre: userData?.me?.favoriteGenre.toLowerCase() },
    skip: !userData?.me?.favoriteGenre
  });

  if (userLoading || booksLoading) return <div>Loading...</div>;
  if (userError || booksError) return <div>Error loading recommendations.</div>;

  const user = userData?.me;
  if (!user) {
    return <div>Please log in to see recommendations.</div>;
  }

  const recommendedBooks = booksData?.allBooks || [];

  return (
    <div>
      <h2>recommendations</h2>
      <p>books in your favorite genre <strong>{user.favoriteGenre.toLowerCase()}</strong></p>
      
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {recommendedBooks.map((book) => (
            <tr key={book.title}>
              <td>{book.title}</td>
              <td>{book.author.name}</td>
              <td>{book.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {recommendedBooks.length === 0 && (
        <p>No books found in your favorite genre.</p>
      )}
    </div>
  );
};

export default Recommended;
