export default function Today() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-12 md:px-8">
      <h1 className="t-page-title">Munshi</h1>
      <p className="t-briefing mt-3 text-ink-2">A chief of staff for a small business.</p>
      <table className="mt-8 w-[12rem] text-right" aria-label="Tabular figure check">
        <tbody>
          <tr>
            <td className="t-ui">₹1,111</td>
          </tr>
          <tr>
            <td className="t-ui">₹8,888</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
