import React from "react";
import { useLocation } from "react-router-dom";
import CreateTimesheet from "./CreateTimesheet";
import ViewTimesheets from "./ViewTimesheets";

const MainPage = () => {
  const location = useLocation();
  const section = location.state?.section || "viewTimesheets"; // default

  return (
    <div>
      {section === "createTimesheet" && <CreateTimesheet />}
      {section === "viewTimesheets" && <ViewTimesheets />}
    </div>
  );
};

export default MainPage;
