import { gql } from '@apollo/client'
import { useQuery, useSubscription } from '@apollo/client'
import { useState, useMemo } from 'react'

const ALL_BOOKS_QUERY = gql`
  query {
    allBooks {
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

const BOOKS_BY_GENRE_QUERY = gql`
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

const BOOK_ADDED = gql`
  subscription {
    bookAdded {
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

const Books = () => {
  const [selectedGenre, setSelectedGenre] = useState(null);
  
  const getButtonStyle = (isActive) => ({
    marginRight: '10px',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : 'black',
    border: '1px solid #dee2e6',
    padding: '5px 10px',
    cursor: 'pointer'
  });
  
  // First query to get all books for genres
  const { data: allBooksData } = useQuery(ALL_BOOKS_QUERY);
  
  // Second query to get filtered books
  const { data: filteredData, loading, error } = useQuery(BOOKS_BY_GENRE_QUERY, {
    variables: { genre: selectedGenre },
    skip: selectedGenre === null
  });
  
  // Subscribe to book additions
  useSubscription(BOOK_ADDED, {
    onData: ({ data, client }) => {
      console.log('Subscription triggered!', data);
      const addedBook = data.data.bookAdded;
      
      // Show notification
      window.alert(`New book added: ${addedBook.title} by ${addedBook.author.name}`);
      console.log('New book added:', addedBook);
      
      // Update the cache for ALL_BOOKS_QUERY
      const existingData = client.readQuery({ query: ALL_BOOKS_QUERY });
      if (existingData) {
        client.writeQuery({
          query: ALL_BOOKS_QUERY,
          data: {
            allBooks: [...existingData.allBooks, addedBook]
          }
        });
      }
      
      // If we have a selected genre, update that query too if the book matches (case-insensitive)
      if (selectedGenre && addedBook.genres.some(genre => 
        genre.toLowerCase() === selectedGenre.toLowerCase()
      )) {
        const existingFilteredData = client.readQuery({ 
          query: BOOKS_BY_GENRE_QUERY, 
          variables: { genre: selectedGenre } 
        });
        if (existingFilteredData) {
          client.writeQuery({
            query: BOOKS_BY_GENRE_QUERY,
            variables: { genre: selectedGenre },
            data: {
              allBooks: [...existingFilteredData.allBooks, addedBook]
            }
          });
        }
      }
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    },
    onComplete: () => {
      console.log('Subscription completed');
    },
  });
  
  // Use filtered data if available, otherwise use all books data
  const displayData = selectedGenre ? filteredData : allBooksData;
  
  // Get all unique genres from all books (case-insensitive deduplication, display in lowercase)
  const allGenres = useMemo(() => {
    if (!allBooksData?.allBooks) return [];
    const genres = new Set();
    allBooksData.allBooks.forEach(book => {
      book.genres.forEach(genre => {
        const cleanGenre = genre.toLowerCase().trim(); // Trim whitespace and convert to lowercase
        if (cleanGenre) { // Only add non-empty genres
          genres.add(cleanGenre);
        }
      });
    });
    const result = Array.from(genres).sort();
    return result;
  }, [allBooksData]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading books.</div>;

  return (
    <div>
      <h2>books</h2>
      {loading && selectedGenre && <div>Filtering books...</div>}
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setSelectedGenre(null)}
          style={getButtonStyle(selectedGenre === null)}
        >
          all genres
        </button>
        {allGenres.map(genre => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            style={getButtonStyle(selectedGenre === genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {displayData?.allBooks?.map((a) => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Books
