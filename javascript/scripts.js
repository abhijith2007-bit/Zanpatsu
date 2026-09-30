const usersStorageKey = "cgpaUsers";

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(usersStorageKey) || "[]");
    } catch (error) {
        return [];
    }
}

function showMessage(messageElement, message, isError) {
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.style.display = "block";
    messageElement.style.color = isError ? "red" : "green";
}

const welcomeMessage = document.getElementById("welcomeMessage");
const currentStudent = localStorage.getItem("cgpaCurrentStudent");

if (welcomeMessage && !window.useSupabaseAuth && currentStudent) {
    welcomeMessage.textContent = `Welcome, ${currentStudent}!`;
    welcomeMessage.hidden = false;
}

const profileButton = document.getElementById("profileButton");
const profilePanel = document.getElementById("profilePanel");
const profileDetails = document.getElementById("profileDetails");
const profileHistory = document.getElementById("profileHistory");
const profileLogoutButton = document.getElementById("profileLogoutButton");

function logOut() {
    if (window.useSupabaseAuth && window.supabaseReady) {
        window.supabaseReady.auth.signOut().then(function () {
            window.location.href = "login.html";
        });
        return;
    }

    if (!currentStudent) {
        window.alert("No account is currently logged in. Please log in before trying to log out.");
        return;
    }

    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) {
        return;
    }

    localStorage.removeItem("cgpaCurrentStudent");
    window.location.href = "login.html";
}

function getLatestSemesterResultsBySemester(results) {
    const latestResultsBySemester = new Map();

    results.forEach((result) => {
        const semesterKey = Number(result.semester);
        const currentTimestamp = result.updatedAt || result.updated_at || 0;
        const existing = latestResultsBySemester.get(semesterKey);
        const existingTimestamp = existing && (existing.updatedAt || existing.updated_at || 0);

        if (!existing || new Date(currentTimestamp) >= new Date(existingTimestamp)) {
            latestResultsBySemester.set(semesterKey, result);
        }
    });

    return Array.from(latestResultsBySemester.values())
        .sort((first, second) => Number(first.semester) - Number(second.semester));
}

function renderLocalProfile(user) {
    if (!profileDetails) return;

    profileDetails.innerHTML = "";

    const profileFields = [
        ["Admission No", user.admissionNumber],
        ["Register No", user.registerNumber],
        ["Name", user.name],
        ["Date of Birth", user.dateOfBirth],
        ["Department", user.department],
        ["Batch", user.batch],
        ["College", user.college],
        ["Email", user.email]
    ];

    profileFields.forEach(([label, value]) => {
        const detail = document.createElement("div");
        detail.className = "profile-detail";

        const labelElement = document.createElement("strong");
        labelElement.textContent = `${label}:`;
        detail.appendChild(labelElement);

        const valueElement = document.createElement("span");
        valueElement.textContent = value || "Not provided";
        detail.appendChild(valueElement);

        profileDetails.appendChild(detail);
    });

    if (profileHistory) {
        const savedResults = JSON.parse(localStorage.getItem("cgpaResults") || "[]");
        const results = getLatestSemesterResultsBySemester(
            savedResults.filter((result) => result.studentName && result.studentName.toLowerCase() === user.name.toLowerCase())
        );

        const overallGpa = document.createElement("div");
        overallGpa.className = "overall-gpa";

        const overallGpaLabel = document.createElement("strong");
        overallGpaLabel.textContent = "Overall GPA";
        overallGpa.appendChild(overallGpaLabel);

        const overallGpaValue = document.createElement("span");
        const overallCredits = results.reduce((total, result) => {
            return total + Number(result.totalCredits || result.total_credits || 0);
        }, 0);
        const overallWeightedPoints = results.reduce((total, result) => {
            const credits = Number(result.totalCredits || result.total_credits || 0);
            const semesterCgpa = Number(result.gpa ?? result.cgpa ?? 0);
            return total + (semesterCgpa * credits);
        }, 0);

        overallGpaValue.textContent = overallCredits > 0
            ? (overallWeightedPoints / overallCredits).toFixed(2)
            : "Not calculated";
        overallGpa.appendChild(overallGpaValue);
        profileHistory.appendChild(overallGpa);

        const historyTitle = document.createElement("h3");
        historyTitle.textContent = "Semester CGPA History";
        profileHistory.appendChild(historyTitle);

        if (results.length === 0) {
            const emptyHistory = document.createElement("p");
            emptyHistory.textContent = "No semester results calculated yet.";
            profileHistory.appendChild(emptyHistory);
        } else {
            results.forEach((result) => {
                const historyEntry = document.createElement("article");
                historyEntry.className = "history-entry";

                const heading = document.createElement("strong");
                heading.textContent = `Semester ${result.semester} CGPA: ${Number(result.gpa ?? result.cgpa ?? 0).toFixed(2)}`;
                historyEntry.appendChild(heading);

                const credits = document.createElement("span");
                credits.textContent = `Credits: ${result.totalCredits || result.total_credits || 0}`;
                historyEntry.appendChild(credits);

                if (result.updatedAt) {
                    const updatedAt = document.createElement("span");
                    updatedAt.textContent = `Last updated: ${new Date(result.updatedAt).toLocaleString()}`;
                    historyEntry.appendChild(updatedAt);
                }

                const courses = document.createElement("span");
                courses.className = "history-courses";
                const selectedCourses = (result.courses || []).filter((course) => {
                    return course.grade && course.grade !== "Not selected";
                });

                if (selectedCourses.length === 0) {
                    courses.textContent = "No grades recorded";
                } else {
                    selectedCourses.forEach((course) => {
                        const courseDetail = document.createElement("span");
                        courseDetail.textContent = [
                            course.code,
                            course.name,
                            `Credits: ${course.credit}`,
                            `Grade: ${course.grade}`,
                            `Points: ${course.gradePoints}`
                        ].filter(Boolean).join(" | ");
                        courses.appendChild(courseDetail);
                    });
                }
                historyEntry.appendChild(courses);
                profileHistory.appendChild(historyEntry);
            });
        }
    }
}

async function renderSupabaseProfile(profile) {
    if (!profileDetails) return;
    profileDetails.innerHTML = "";

    const profileFields = [
        ["Admission No", profile.admission_number],
        ["Register No", profile.register_number],
        ["Name", profile.full_name],
        ["Date of Birth", profile.date_of_birth],
        ["Department", profile.department],
        ["Batch", profile.batch],
        ["College", profile.college],
        ["Email", profile.email]
    ];

    profileFields.forEach(([label, value]) => {
        const detail = document.createElement("div");
        detail.className = "profile-detail";

        const labelElement = document.createElement("strong");
        labelElement.textContent = `${label}:`;
        detail.appendChild(labelElement);

        const valueElement = document.createElement("span");
        valueElement.textContent = value || "Not provided";
        detail.appendChild(valueElement);

        profileDetails.appendChild(detail);
    });

    if (!profileHistory) return;
    profileHistory.innerHTML = "";

    if (!window.supabaseReady) {
        profileHistory.textContent = "No semester history available.";
        return;
    }

    const { data: results, error: resultsError } = await window.supabaseReady
        .from("semester_results")
        .select("*")
        .eq("student_id", profile.id)
        .order("semester", { ascending: true });

    if (resultsError) {
        profileHistory.textContent = "Unable to load semester history.";
        return;
    }

    const deduplicatedResults = getLatestSemesterResultsBySemester((results || []).map((result) => ({
        ...result,
        semester: result.semester,
        updatedAt: result.updated_at,
        gpa: result.semester_gpa,
        cgpa: result.semester_gpa,
        totalCredits: result.total_credits,
        total_credits: result.total_credits,
        courses: result.courses || []
    })));

    const overallGpa = document.createElement("div");
    overallGpa.className = "overall-gpa";

    const overallGpaLabel = document.createElement("strong");
    overallGpaLabel.textContent = "Overall GPA";
    overallGpa.appendChild(overallGpaLabel);

    const overallGpaValue = document.createElement("span");
    const latestResult = (results || []).slice(-1)[0];
    overallGpaValue.textContent = latestResult && latestResult.overall_gpa
        ? Number(latestResult.overall_gpa).toFixed(2)
        : "Not calculated";
    overallGpa.appendChild(overallGpaValue);
    profileHistory.appendChild(overallGpa);

    const historyTitle = document.createElement("h3");
    historyTitle.textContent = "Semester CGPA History";
    profileHistory.appendChild(historyTitle);

    if (!deduplicatedResults || deduplicatedResults.length === 0) {
        const emptyHistory = document.createElement("p");
        emptyHistory.textContent = "No semester results calculated yet.";
        profileHistory.appendChild(emptyHistory);
        return;
    }

    deduplicatedResults.forEach((result) => {
        const historyEntry = document.createElement("article");
        historyEntry.className = "history-entry";

        const heading = document.createElement("strong");
        heading.textContent = `Semester ${result.semester} CGPA: ${Number(result.semester_gpa || 0).toFixed(2)}`;
        historyEntry.appendChild(heading);

        const credits = document.createElement("span");
        credits.textContent = `Credits: ${result.total_credits || 0}`;
        historyEntry.appendChild(credits);

        if (result.updated_at) {
            const updatedAt = document.createElement("span");
            updatedAt.textContent = `Last updated: ${new Date(result.updated_at).toLocaleString()}`;
            historyEntry.appendChild(updatedAt);
        }

        const courses = document.createElement("span");
        courses.className = "history-courses";
        const selectedCourses = (result.courses || []).filter((course) => {
            return course.grade && course.grade !== "Not selected";
        });

        if (selectedCourses.length === 0) {
            courses.textContent = "No grades recorded";
        } else {
            selectedCourses.forEach((course) => {
                const courseDetail = document.createElement("span");
                courseDetail.textContent = [
                    course.code,
                    course.name,
                    `Credits: ${course.credit}`,
                    `Grade: ${course.grade}`,
                    `Points: ${course.gradePoints}`
                ].filter(Boolean).join(" | ");
                courses.appendChild(courseDetail);
            });
        }

        historyEntry.appendChild(courses);
        profileHistory.appendChild(historyEntry);
    });
}

if (profileButton && profilePanel && profileDetails) {
    if (window.supabaseReady) {
        const studentName = localStorage.getItem("cgpaCurrentStudent");
        if (studentName) {
            window.supabaseReady
                .from("student_profiles")
                .select("*")
                .eq("full_name", studentName)
                .maybeSingle()
                .then(({ data: profile, error }) => {
                    if (profile && !error) {
                        if (profileLogoutButton) profileLogoutButton.hidden = false;
                        renderSupabaseProfile(profile);
                    } else {
                        const user = getUsers().find((storedUser) => {
                            return storedUser.name && storedUser.name.toLowerCase() === studentName.toLowerCase();
                        });
                        if (user) {
                            renderLocalProfile(user);
                        } else {
                            profileDetails.textContent = "Log in to view your student details.";
                            if (profileHistory) {
                                profileHistory.hidden = true;
                            }
                            if (profileLogoutButton) {
                                profileLogoutButton.hidden = true;
                            }
                        }
                    }
                });
        } else {
            profileDetails.textContent = "Log in to view your student details.";
            if (profileHistory) {
                profileHistory.hidden = true;
            }
            if (profileLogoutButton) {
                profileLogoutButton.hidden = true;
            }
        }
    } else {
        const user = getUsers().find((storedUser) => {
            return storedUser.name && storedUser.name.toLowerCase() === (currentStudent || "").toLowerCase();
        });

        if (user) {
            renderLocalProfile(user);
        } else {
            profileDetails.textContent = "Log in to view your student details.";
            if (profileHistory) {
                profileHistory.hidden = true;
            }
            if (profileLogoutButton) {
                profileLogoutButton.hidden = true;
            }
        }
    }

    profileButton.addEventListener("click", function () {
        const isOpen = !profilePanel.hidden;
        profilePanel.hidden = isOpen;
        profileButton.setAttribute("aria-expanded", String(!isOpen));
    });

    document.addEventListener("click", function (event) {
        if (!profilePanel.contains(event.target) && !profileButton.contains(event.target)) {
            profilePanel.hidden = true;
            profileButton.setAttribute("aria-expanded", "false");
        }
    });
}

if (profileLogoutButton) {
    profileLogoutButton.addEventListener("click", logOut);
}

const registrationForm = document.getElementById("registerForm");

if (registrationForm) {
    registrationForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const admissionNumber = document.getElementById("admissionNumber").value.trim();
        const registerNumber = document.getElementById("registerNumber").value.trim();
        const name = document.getElementById("name").value.trim();
        const dateOfBirth = document.getElementById("dateOfBirth").value;
        const department = document.getElementById("department").value.trim();
        const batch = document.getElementById("batch").value.trim();
        const college = document.getElementById("college").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const errorMessages = document.getElementById("errorMessages");

        if (!name || !password) {
            showMessage(errorMessages, "Name and password are required.", true);
            return;
        }

        try {
            if (window.supabaseReady) {
                const { data: matchingUsers, error: existingError } = await window.supabaseReady
                    .from("student_profiles")
                    .select("id")
                    .eq("full_name", name)
                    .limit(1);

                if (existingError) throw existingError;
                if (matchingUsers && matchingUsers.length > 0) {
                    throw new Error("A student with this name already exists.");
                }

                const { error: profileError } = await window.supabaseReady
                    .from("student_profiles")
                    .insert({
                        admission_number: admissionNumber || "",
                        register_number: registerNumber || "",
                        full_name: name,
                        password,
                        date_of_birth: dateOfBirth || null,
                        department: department || "",
                        batch: batch || "",
                        college: college || "",
                        email: email || ""
                    });

                if (profileError) throw profileError;
                showMessage(errorMessages, "Registration successful. You can now log in.", false);
                registrationForm.reset();
                return;
            }

            const users = getUsers();
            if (users.some((user) => user.name && user.name.toLowerCase() === name.toLowerCase())) {
                throw new Error("A student with this name already exists.");
            }

            users.push({
                admissionNumber,
                registerNumber,
                name,
                dateOfBirth,
                department,
                batch,
                college,
                email,
                password
            });

            localStorage.setItem(usersStorageKey, JSON.stringify(users));
            showMessage(errorMessages, "Registration successful. You can now log in.", false);
            registrationForm.reset();
        } catch (error) {
            showMessage(errorMessages, error.message || "Registration failed.", true);
        }
    });
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("collegeId").value.trim();
        const password = document.getElementById("password").value;
        const errorMessages = document.getElementById("errorMessages");

        try {
            if (window.supabaseReady) {
                const { data: user, error: userError } = await window.supabaseReady
                    .from("student_profiles")
                    .select("*")
                    .eq("full_name", name)
                    .eq("password", password)
                    .maybeSingle();

                if (userError) throw userError;
                if (!user) {
                    throw new Error("Invalid name or password.");
                }

                localStorage.setItem("cgpaCurrentStudent", user.full_name);
                window.location.href = "home.html";
                return;
            }

            const user = getUsers().find((storedUser) => {
                return storedUser.name && storedUser.name.toLowerCase() === name.toLowerCase() && storedUser.password === password;
            });

            if (!user) {
                throw new Error("Invalid name or password.");
            }

            localStorage.setItem("cgpaCurrentStudent", user.name);
            window.location.href = "home.html";
        } catch (error) {
            showMessage(errorMessages, error.message || "Login failed.", true);
        }
    });
}

async function initializeSupabaseProfile() {
    if (!profileButton || !profilePanel || !profileDetails) return;

    if (window.supabaseReady) {
        const currentStudentName = localStorage.getItem("cgpaCurrentStudent");
        if (!currentStudentName) return;

        const { data: profile, error: profileError } = await window.supabaseReady
            .from("student_profiles")
            .select("*")
            .eq("full_name", currentStudentName)
            .maybeSingle();

        if (profileError || !profile) return;

        if (profileLogoutButton) profileLogoutButton.hidden = false;
        renderSupabaseProfile(profile);

        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${profile.full_name}!`;
            welcomeMessage.hidden = false;
        }
        return;
    }

    if (!window.supabaseReady) return;
}

initializeSupabaseProfile();
