import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client'


const BOOKS_QUERY = gql`
  query {
    allBooks {
      title
      author
      published
    }
  }
`;

const Books = () => {
  const { data, loading, error } = useQuery(BOOKS_QUERY);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading books.</div>;

  return (
    <div>
      <h2>books</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {data.allBooks.map((a) => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Books
