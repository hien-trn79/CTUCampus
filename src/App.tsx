import MapCanvas from "./components/map/MapCanvas";
import { MenuBar } from "./components/MenuBar";

function App() {
  return (
    <>
      <div className="mapCanvas bg-blue-50">
        <MenuBar />
        <MapCanvas />
      </div>
    </>
  );
}

export default App;
