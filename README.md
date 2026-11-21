# AttendEase – Smart Attendance Tracker & Bunk Calculator

**AttendEase** is a student-friendly attendance management web application designed to help college students track their attendance, calculate safe bunks, manage subjects, and monitor their academic progress through a simple and modern dashboard.

It also includes a built-in chatbot assistant that helps users understand the application's features and provides attendance-related information using their locally saved data.

---

## 🚀 Features

### 1. Student Dashboard
- Personalized dashboard with student name.
- Overall attendance percentage.
- Total conducted classes.
- Total attended classes.
- Safe bunk summary.
- Subject-wise attendance overview.
- Recent attendance records.

### 2. Subject Management
- Add new subjects.
- Edit subject details.
- Delete subjects.
- Set individual attendance targets.
- Assign different colors to subjects.
- View subject-wise attendance statistics.

### 3. Smart Bunk Calculator
- Calculate overall safe bunks.
- Calculate subject-wise safe bunks.
- Set a required attendance percentage.
- Find out how many consecutive classes can be missed.
- Calculate how many consecutive classes need to be attended to reach the target.

### 4. Attendance Management
- Mark attendance as:
  - Present
  - Absent
  - Cancelled
- Select the subject and class date.
- Update an existing attendance record for the same subject and date.
- Cancelled classes are excluded from attendance calculations.

### 5. Attendance Analytics
- Subject-wise attendance performance.
- Present vs absent attendance distribution.
- Attendance trends for the last 14 days.
- Visual charts using HTML Canvas.

### 6. Attendance Calendar
- Monthly attendance calendar.
- Navigate between months.
- View attendance records for individual dates.
- Visual indicators for Present, Absent, and Cancelled classes.

### 7. Timetable Management
- Add weekly class schedules.
- Select subjects and weekdays.
- Set class start and end times.
- Add room or classroom details.
- Delete timetable entries.

### 8. Dark Mode
- Switch between light and dark themes.
- Save the selected theme in browser storage.

### 9. PDF Report
- Print attendance reports.
- Save reports as PDF using the browser's print dialog.

### 10. AttendEase Chatbot Assistant
- Floating chatbot available at the bottom-right corner.
- Opens an interactive chat window.
- Answers frequently asked questions about AttendEase.
- Provides information about attendance calculations and safe bunks.
- Reads locally stored attendance and subject data.
- Helps users understand how to use different website features.

**Note:** The chatbot currently uses predefined responses and keyword-based matching. It is a frontend FAQ assistant, not a live generative AI chatbot.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and responsive design |
| Vanilla JavaScript | Application logic and interactivity |
| LocalStorage | Saving student data in the browser |
| HTML Canvas | Attendance charts |
| Browser Print API | Printing and saving PDF reports |

No frontend framework, backend, database, or external JavaScript package is required.

## 💾 Data Storage

AttendEase uses the browser's built-in **LocalStorage** to save application data.

The following information is stored locally:

- Student profile
- Subject details
- Attendance records
- Timetable entries
- Theme preferences
- Attendance targets

### Important Storage Information

- Data remains available after refreshing the page in the same browser.
- Data is stored on the current device and browser.
- Data does not automatically synchronize between devices.
- Clearing browser site data may permanently erase saved records.
- There is currently no cloud backup or database integration.
- This project does not implement secure user authentication.

Avoid storing sensitive personal information.

---

## 🤖 How the Chatbot Works

The AttendEase chatbot is a lightweight JavaScript-based assistant.

It uses:
- Keyword and intent matching.
- Predefined FAQ responses.
- LocalStorage to access attendance and subject information.
- JavaScript DOM manipulation to display chat messages.

It can answer questions related to:
- Overall attendance.
- Attendance percentage formula.
- Safe bunks.
- Subject-wise attendance.
- Marking attendance.
- Timetable.
- Attendance calendar.
- Analytics and PDF reports.
- Dark mode.
- Data storage.

The chatbot is designed to work without an API key or backend server.

**Future Scope:** Integration with a generative AI API through a secure backend or serverless function can make the chatbot capable of answering more open-ended questions. Private API keys must never be exposed in frontend JavaScript.

### Vercel

1. Visit [Vercel](https://vercel.com/).
2. Sign in using your GitHub account.
3. Select **Add New Project**.
4. Import the AttendEase GitHub repository.
5. Set Framework Preset to **Other**.
6. Leave the Build Command empty.
7. Set Output Directory to `.` if required.
8. Click **Deploy**.

Your AttendEase website will be live after deployment.

---

## 🔮 Future Improvements

Possible improvements for future versions include:

- Secure student authentication.
- Cloud database integration.
- Cross-device data synchronization.
- Attendance backup and restore functionality.
- Real AI-powered chatbot integration.
- Automatic timetable-based attendance reminders.
- Excel and CSV report export.
- Progressive Web App (PWA) support.
- Multiple student profiles.

---

## 🎯 Project Objective

The main objective of AttendEase is to simplify attendance tracking for college students and help them make informed decisions about their attendance.

Instead of manually calculating attendance percentages and safe bunks, students can use one dashboard to manage their subjects, monitor attendance, view analytics, and plan their academic schedule.

---

## 👨‍💻 Author

**Developed as a college project.**

Project Name: AttendEase  
Category: Web Development  
Project Type: Student Attendance Management System  
Technologies: HTML, CSS, Vanilla JavaScript

---

## 📄 License

This project is created for educational and learning purposes.

You may modify and improve the source code for personal and educational use.

---

**AttendEase – Track Smart. Attend Better. Stay Ahead. 💜**
