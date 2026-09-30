document.addEventListener('DOMContentLoaded', function () {
  const calculateBtn = document.getElementById('calculate');
  const resultText = document.getElementById('resultText');
  const totalGpaText = document.getElementById('totalGpaText');
  const calculatorForm = document.querySelector('#calculator form');
  const semesterModal = document.getElementById('semesterModal');
  const semesterOptions = document.getElementById('semesterOptions');
  const semesterChooser = document.getElementById('semesterChooser');
  const downloadCertificateBtn = document.getElementById('downloadCertificate');

  if (!calculateBtn || !resultText || !totalGpaText || !calculatorForm || !semesterModal || !semesterOptions || !semesterChooser) return;

  const gradeOptions = [
    ['10', 'O'], ['9', 'A+'], ['8', 'A'], ['7', 'B+'], ['6.5', 'B'],
    ['6', 'C+'], ['5', 'C'], ['4', 'D'], ['U', 'U'], ['UA', 'UA']
  ];

  const creditLists = [
    [1, 4, 2.5, 4, 4, 3, 4],
    [1, 4, 4, 4, 4, 1.5, 1.5, 1.5],
    [4, 4, 4, 3, 4, 4, 1],
    [3, 4, 3, 2, 4, 3, 1, 1, 1, 1],
    [3, 3, 3, 4, 4, 4, 1, 1, 1]
  ];

  const semesters = [
    [['24GE101', 'Heritage of Tamils'], ['24MA101', 'Matrices and Calculus'], ['24EN101', 'English for Engineers'], ['24PH101', 'Engineering Physics'], ['24CY101', 'Engineering Chemistry'], ['24ME201', 'Engineering Graphics and Design'], ['24CS201', 'Programming for Problem Solving using C']],
    [['24GE201', 'Tamil and Technology'], ['24MA201', 'Complex Variables and Transforms'], ['24EC302', 'Digital Logic Circuits and Design'], ['24EE204', 'Basics of Electrical and Electronics Engineering'], ['24EE404', 'IoT - Sensors and Devices'], ['24CS331', 'Programming for Problem Solving using Python'], ['24GE231', 'Workshop Practice'], ['24EN201', 'Presentation and Language Skills Laboratory']],
    [['24MA301', 'Probability, Random Process and Statistics'], ['24EC501', 'Microprocessors, Microcontrollers and Interfacing Techniques'], ['24CS301', 'Data Structures and Algorithms'], ['24CS302', 'Object Oriented Programming using Java'], ['24CS303', 'Computer Architecture and Organization'], ['24CS304', 'Database Management System'], ['24CS351', 'Mini Project-I (Design and Programming Fundamentals)']],
    [['24MA402', 'Discrete Mathematics and Linear Algebra'], ['24CS403', 'Theory of Computation'], ['24CS404', 'Operating Systems'], ['24CY401', 'Environmental Science and Engineering'], ['24CS405', 'Applied Software Engineering with Design and DevOps Practices'], ['24CS401', 'Computer Networks'], ['24CS431', 'Operating Systems Laboratory'], ['24CS451', 'Mini Project-II (Community Service Project)'], ['24EN451', 'Soft Skills Laboratory'], ['24CS432', 'GitHub and CI/CD Basics Laboratory']],
    [['24AI57X', 'Professional Elective-I'], ['24CS58X', 'Professional Elective-II'], ['24XXXX', 'Open Elective-I'], ['24CS501', 'Compiler Design'], ['24CS502', 'Artificial Intelligence and Machine Learning'], ['24CS503', 'Design and Analysis of Algorithms'], ['24CS551', 'Mini Project-III (Application Development)'], ['24EN631', 'Professional Communication and Leadership for Industry Readiness'], ['24GE551', 'Quantitative and Reasoning Skills-I']]
  ].map(function (courses, semesterIndex) {
    return courses.map(function (course, courseIndex) {
      return { code: course[0], name: course[1], credit: creditLists[semesterIndex][courseIndex] };
    });
  });

  let selectedSemester = null;
  let certificateCourses = [];
  let calculatedCgpa = null;

  async function getCurrentSupabaseStudent() {
    if (!window.supabaseReady) {
      return null;
    }

    const studentName = localStorage.getItem('cgpaCurrentStudent');

    if (!studentName) {
      return null;
    }

    try {
      const { data: profile, error: profileError } = await window.supabaseReady
        .from('student_profiles')
        .select('id, full_name')
        .eq('full_name', studentName)
        .maybeSingle();

      if (profileError || !profile) {
        return null;
      }

      return profile;
    } catch (error) {
      return null;
    }
  }

  function calculateCombinedCgpa(currentCgpa, currentCredits, previousResults) {
    const previousTotalCredits = previousResults.reduce(function (sum, row) {
      return sum + Number(row.totalCredits || row.total_credits || 0);
    }, 0);

    const previousWeightedPoints = previousResults.reduce(function (sum, row) {
      return sum + (Number(row.cgpa || 0) * Number(row.totalCredits || row.total_credits || 0));
    }, 0);

    const combinedCredits = previousTotalCredits + Number(currentCredits || 0);
    if (combinedCredits === 0) return 0;

    return (previousWeightedPoints + (Number(currentCgpa) * Number(currentCredits || 0))) / combinedCredits;
  }

  function deduplicateSemesterResults(results) {
    const latestResultsBySemester = new Map();

    (results || []).forEach(function (result) {
      const semesterKey = Number(result.semester);
      const timestamp = result.updatedAt || result.updated_at || 0;
      const existing = latestResultsBySemester.get(semesterKey);
      const existingTimestamp = existing && (existing.updatedAt || existing.updated_at || 0);

      if (!existing || new Date(timestamp) >= new Date(existingTimestamp)) {
        latestResultsBySemester.set(semesterKey, result);
      }
    });

    return Array.from(latestResultsBySemester.values()).sort(function (first, second) {
      return Number(first.semester) - Number(second.semester);
    });
  }

  async function loadPreviousResults() {
    const studentName = localStorage.getItem('cgpaCurrentStudent');

    if (!studentName) {
      return [];
    }

    if (window.supabaseReady) {
      try {
        const currentProfile = await getCurrentSupabaseStudent();
        if (!currentProfile || currentProfile.id === undefined || currentProfile.id === null) {
          return [];
        }

        const { data: cloudResults, error: resultsError } = await window.supabaseReady
          .from('semester_results')
          .select('*')
          .eq('student_id', currentProfile.id)
          .order('semester', { ascending: true });

        if (resultsError) throw resultsError;

        return deduplicateSemesterResults((cloudResults || []).map(function (result) {
          return {
            semester: result.semester,
            cgpa: result.semester_gpa,
            gpa: result.semester_gpa,
            totalGpa: result.overall_gpa,
            totalCredits: result.total_credits,
            updatedAt: result.updated_at,
            courses: result.courses || []
          };
        }));
      } catch (error) {
        return [];
      }
    }

    const storedResults = JSON.parse(localStorage.getItem('cgpaResults') || '[]');
    return deduplicateSemesterResults(storedResults.filter(function (result) {
      return result.studentName && result.studentName.toLowerCase() === studentName.toLowerCase();
    }));
  }

  function showSemesterModal() {
    semesterModal.classList.add('is-open');
  }

  function renderSemester(semesterNumber) {
    selectedSemester = semesterNumber;
    semesterChooser.textContent = 'Semester ' + semesterNumber + ' selected';
    calculatorForm.innerHTML = '<p class="lead">Enter the course grades and verify the credits for Semester ' + semesterNumber + '.</p>';

    semesters[semesterNumber - 1].forEach(function (course, courseIndex) {
      const row = document.createElement('div');
      row.className = 'course-row';
        row.innerHTML = '<label>Course ' + (courseIndex + 1) + '<span><strong>' + course.code + '</strong> ' + course.name + '</span></label>' +
        '<input class="form-control credit-input" type="number" value="' + course.credit + '" readonly aria-label="Credits for ' + course.name + '">' +
        '<select class="form-control grade-input" aria-label="Grade for ' + course.name + '"><option selected disabled value="">-- Grade --</option></select>';

      const gradeSelect = row.querySelector('.grade-input');
      gradeOptions.forEach(function (option) {
        gradeSelect.add(new Option(option[1], option[0]));
      });
      calculatorForm.appendChild(row);
    });

    semesterModal.classList.remove('is-open');
    resultText.textContent = 'Your CGPA will appear here.';
    totalGpaText.textContent = 'Your Total GPA will appear here.';
    certificateCourses = [];
    calculatedCgpa = null;
    if (downloadCertificateBtn) downloadCertificateBtn.hidden = true;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[character];
    });
  }

  async function downloadCertificate() {
    let studentName = localStorage.getItem('cgpaCurrentStudent');

    if (!studentName) {
      window.alert('Please log in before downloading your CGPA certificate.');
      return;
    }

    let profile = null;

    if (!window.supabaseReady) {
      window.alert('Supabase is not configured, so certificate details cannot be fetched from the database.');
      return;
    }

    try {
      const trimmedName = String(studentName || '').trim();
      const { data: cloudProfile, error: profileError } = await window.supabaseReady
        .from('student_profiles')
        .select('*')
        .eq('full_name', trimmedName)
        .maybeSingle();

      if (profileError) {
        console.warn('Unable to load Supabase profile for certificate:', profileError.message);
      }

      if (!cloudProfile) {
        window.alert('Student profile not found in Supabase. Please make sure the account was registered successfully.');
        return;
      }

      profile = {
        admissionNumber: cloudProfile.admission_number,
        registerNumber: cloudProfile.register_number,
        name: cloudProfile.full_name,
        dateOfBirth: cloudProfile.date_of_birth,
        department: cloudProfile.department,
        batch: cloudProfile.batch,
        college: cloudProfile.college,
        email: cloudProfile.email
      };
    } catch (error) {
      console.warn('Supabase profile fetch failed during certificate generation:', error);
      window.alert('Unable to fetch student details from Supabase.');
      return;
    }

    const profileFields = [
      ['Admission No', profile && profile.admissionNumber],
      ['Register No', profile && profile.registerNumber],
      ['Name', profile && profile.name ? profile.name : studentName],
      ['Date of Birth', profile && profile.dateOfBirth],
      ['Department', profile && profile.department],
      ['Batch', profile && profile.batch],
      ['College', profile && profile.college],
      ['Email', profile && profile.email]
    ];
    const profileRows = profileFields.map(function (field) {
      return '<tr><th>' + escapeHtml(field[0]) + '</th><td>' +
        escapeHtml(field[1] || 'Not provided') + '</td></tr>';
    }).join('');

    const subjectRows = certificateCourses.map(function (course) {
        return '<tr><td>' + escapeHtml(course.code) + '</td><td>' + escapeHtml(course.name) + '</td><td>' + course.credit + '</td><td>' +
        escapeHtml(course.grade) + '</td><td>' + course.gradePoints + '</td></tr>';
    }).join('');
    const certificateHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<title>CGPA Certificate - Semester ' + selectedSemester + ' - ' + escapeHtml(studentName) + '</title>' +
      '<style>body{font-family:Arial,sans-serif;color:#17324d;max-width:900px;margin:40px auto;padding:20px}' +
      'h1{text-align:center;color:#17324d}h2{text-align:center;color:#536477;font-weight:normal}' +
      'table{width:100%;border-collapse:collapse;margin-top:28px}th,td{border:1px solid #b9c8d6;padding:12px;text-align:left}' +
      'th{background:#17324d;color:#fff}.profile-table{margin-top:20px}.profile-table th{width:30%}' +
      'tfoot td{font-weight:bold;background:#fce8df}' +
      '.summary{margin-top:28px;padding:20px;background:#f3f6fb;border-left:5px solid #f08a72}' +
      '</style></head><body><h1>CGPA Certificate</h1><h2>CGPA Calculator</h2>' +
      '<h3>Student Profile</h3><table class="profile-table"><tbody>' + profileRows + '</tbody></table>' +
      '<p><strong>Semester:</strong> ' + selectedSemester + '</p>' +
      '<table><thead><tr><th>Course Code</th><th>Subject Name</th><th>Credits</th><th>Grade</th><th>Grade Points</th></tr></thead>' +
      '<tbody>' + subjectRows + '</tbody><tfoot><tr><td colspan="4">Total Credits</td><td>' +
      certificateCourses.reduce(function (total, course) {
        return total + (course.grade === 'Not selected' ? 0 : course.credit);
      }, 0) +
      '</td></tr></tfoot></table><div class="summary"><strong>CGPA:</strong> ' + calculatedCgpa.toFixed(2) +
      '</div></body></html>';
    const file = new Blob([certificateHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = 'cgpa-certificate-' + studentName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.html';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  semesters.forEach(function (_, index) {
    const semesterButton = document.createElement('button');
    semesterButton.type = 'button';
    semesterButton.className = 'semester-option';
    semesterButton.textContent = 'Semester ' + (index + 1);
    semesterButton.addEventListener('click', function () {
      renderSemester(index + 1);
    });
    semesterOptions.appendChild(semesterButton);
  });

  semesterChooser.addEventListener('click', showSemesterModal);

  calculateBtn.addEventListener('click', async function () {
    if (selectedSemester === null) {
      resultText.textContent = 'Please select a semester first.';
      totalGpaText.textContent = 'Please select a semester first.';
      showSemesterModal();
      return;
    }

    let weightedGradePoints = 0;
    let totalCredits = 0;
    let hasSelectedCourse = false;
    certificateCourses = [];

    calculatorForm.querySelectorAll('.course-row').forEach(function (row, courseIndex) {
      const credit = Number(row.querySelector('.credit-input').value);
      const grade = row.querySelector('.grade-input').value;
      const course = semesters[selectedSemester - 1][courseIndex];
      const gradePoints = grade === 'U' || grade === 'UA' ? 0 : Number(grade);
      const gradeLabel = gradeOptions.find(function (option) {
        return option[0] === grade;
      });

      certificateCourses.push({
        code: course.code,
        name: course.name,
        credit: credit,
        grade: gradeLabel ? gradeLabel[1] : 'Not selected',
        gradePoints: grade ? gradePoints : '-'
      });

      if (!grade) return;
      hasSelectedCourse = true;

      weightedGradePoints += credit * gradePoints;
      totalCredits += credit;
    });

    if (!hasSelectedCourse || totalCredits === 0) {
      resultText.textContent = 'Please select at least one course grade.';
      totalGpaText.textContent = 'Please select at least one course grade.';
      return;
    }

    const cgpa = weightedGradePoints / totalCredits;
    calculatedCgpa = cgpa;
    resultText.textContent = 'Semester ' + selectedSemester + ' CGPA: ' + cgpa.toFixed(2);

    let studentName = localStorage.getItem('cgpaCurrentStudent');
    let supabaseStudent = null;

    if (window.supabaseReady) {
      try {
        supabaseStudent = await getCurrentSupabaseStudent();
        if (supabaseStudent && supabaseStudent.full_name) {
          studentName = supabaseStudent.full_name;
        }
      } catch (error) {
        supabaseStudent = null;
      }
    }

    const previousResults = studentName ? await loadPreviousResults() : [];
    const priorResultsForSemester = previousResults.filter(function (result) {
      return Number(result.semester) < Number(selectedSemester);
    });
    const totalGpa = calculateCombinedCgpa(cgpa, totalCredits, priorResultsForSemester);
    totalGpaText.textContent = 'Total GPA: ' + Number(totalGpa || 0).toFixed(2);

    if (supabaseStudent && window.supabaseReady) {
      const { error: saveError } = await window.supabaseReady
        .from('semester_results')
        .upsert({
          student_id: supabaseStudent.id,
          semester: selectedSemester,
          semester_gpa: Number(cgpa.toFixed(2)),
          overall_gpa: Number(totalGpa.toFixed(2)),
          total_credits: totalCredits,
          courses: certificateCourses,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id,semester' });

      if (saveError) {
        console.error('Unable to save semester result:', saveError);
        totalGpaText.textContent = 'Total GPA: ' + totalGpa.toFixed(2) + ' (not saved)';
        window.alert('GPA calculated, but it could not be saved to Supabase: ' + saveError.message);
      }
    } else if (studentName) {
      const storedResults = JSON.parse(localStorage.getItem('cgpaResults') || '[]');
      const updatedResult = {
        studentName: studentName,
        semester: selectedSemester,
        cgpa: cgpa,
        gpa: cgpa,
        totalGpa: totalGpa,
        courses: certificateCourses,
        totalCredits: totalCredits,
        updatedAt: new Date().toISOString()
      };

      const studentResults = storedResults.filter(function (result) {
        return result.studentName && result.studentName.toLowerCase() === studentName.toLowerCase();
      });
      const otherResults = storedResults.filter(function (result) {
        return !result.studentName || result.studentName.toLowerCase() !== studentName.toLowerCase();
      });
      const deduplicatedStudentResults = deduplicateSemesterResults(studentResults.concat(updatedResult));

      localStorage.setItem('cgpaResults', JSON.stringify(otherResults.concat(deduplicatedStudentResults)));
    }

    if (downloadCertificateBtn) {
      downloadCertificateBtn.hidden = !studentName;
    }
  });

  if (downloadCertificateBtn) {
    downloadCertificateBtn.addEventListener('click', downloadCertificate);
  }

  showSemesterModal();
});
