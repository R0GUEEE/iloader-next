import Header from "./parts/Header";
import Devices from "./parts/Devices";
import Account from "./parts/Account";
import Install from "./parts/Install";
import Settings from "./parts/Settings";

function App() {
  return (
    <>
      <Header />
      <main className="flex gap-5 m-2 mt-3 flex-wrap">
        <Account />
        <Devices />
        <Install />
        <Settings />
      </main>
    </>
  );
}

export default App;
