"use client"

import type React from "react"

import { useState } from "react"
import { Upload, Download, FileSpreadsheet, AlertCircle, ChevronDown, Search, Filter, Grid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const API_BASE_URL = "http://localhost:3000/api/v1/cgpa"

type Student = {
  StudentID: string
  Name: string
  Course1?: string
  Grade1?: string
  Unit1?: string
  Course2?: string
  Grade2?: string
  Unit2?: string
  Course3?: string
  Grade3?: string
  Unit3?: string
  cgpa: number
  [key: string]: any
}

type ApiResponse = {
  message: string
  data: Student[]
  download: string
}

export default function Home() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [activeView, setActiveView] = useState("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "id" | "cgpa">("cgpa")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("students")

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      setError("Only CSV files are allowed!")
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append("file", file)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 300)

      console.log("Uploading to:", `${API_BASE_URL}/upload`)

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
        mode: "cors",
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        console.error("Upload failed:", response.status, errorText)
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("Upload successful:", data)
      setResult(data)
    } catch (err) {
      console.error("Upload error:", err)
      setError(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Network error when uploading file. The server might be unreachable or CORS might be blocking the request.",
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = () => {
    if (result?.download) {
      window.open(result.download, "_blank")
    }
  }

  const getCgpaColor = (cgpa: number) => {
    if (cgpa >= 4.5) return "bg-green-50 text-green-700 border-green-200"
    if (cgpa >= 3.5) return "bg-blue-50 text-blue-700 border-blue-200"
    if (cgpa >= 2.5) return "bg-yellow-50 text-yellow-700 border-yellow-200"
    if (cgpa >= 1.5) return "bg-orange-50 text-orange-700 border-orange-200"
    return "bg-red-50 text-red-700 border-red-200"
  }

  const getGradeLabel = (cgpa: number) => {
    if (cgpa >= 4.5) return "Excellent"
    if (cgpa >= 3.5) return "Very Good"
    if (cgpa >= 2.5) return "Good"
    if (cgpa >= 1.5) return "Fair"
    return "Poor"
  }

  const testApiConnection = async () => {
    try {
      setError("Testing connection to API...")
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${API_BASE_URL}`, {
        method: "GET",
        mode: "cors",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setError("API connection successful, but upload still failed. This might be a CORS issue.")
      } else {
        setError(`API responded with status: ${response.status}`)
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("API connection timed out. The server might be down or unreachable.")
        } else {
          setError(`API connection test failed: ${err.message}`)
        }
      } else {
        setError("Unknown error when testing API connection")
      }
    }
  }

  // Extract courses from student data
  const extractCourses = (student: Student) => {
    const courses = []
    for (let i = 1; i <= 10; i++) {
      if (student[`Course${i}`] && student[`Grade${i}`]) {
        courses.push({
          code: student[`Course${i}`],
          grade: student[`Grade${i}`],
          unit: student[`Unit${i}`],
        })
      }
    }
    return courses
  }

  // Filter and sort students
  const getFilteredAndSortedStudents = () => {
    if (!result?.data) return []

    let filteredStudents = result.data

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredStudents = filteredStudents.filter(
        (student) => student.Name.toLowerCase().includes(query) || student.StudentID.toLowerCase().includes(query),
      )
    }

    // Apply sorting
    return [...filteredStudents].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" ? a.Name.localeCompare(b.Name) : b.Name.localeCompare(a.Name)
      } else if (sortBy === "id") {
        return sortOrder === "asc" ? a.StudentID.localeCompare(b.StudentID) : b.StudentID.localeCompare(a.StudentID)
      } else {
        return sortOrder === "asc" ? a.cgpa - b.cgpa : b.cgpa - a.cgpa
      }
    })
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">CGPA Calculator</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Upload a CSV file to calculate and view student CGPAs. The system will process the data and provide a
            detailed breakdown of results.
          </p>
        </header>

        {!result && (
          <Card className="mb-8 border-black/5 shadow-sm max-w-3xl mx-auto">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileSpreadsheet className="h-6 w-6" />
                Upload CSV File
              </CardTitle>
              <CardDescription className="text-base">
                Upload a CSV file containing student grades to calculate CGPA
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <span className="text-lg font-medium mb-2">
                    {isUploading ? "Uploading..." : "Click to upload CSV file"}
                  </span>
                  <span className="text-sm text-gray-500 max-w-md">
                    The file should contain student data with grades and units. Only CSV files are supported.
                  </span>
                </label>
              </div>

              {isUploading && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive" className="mb-8 max-w-3xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={testApiConnection} className="self-start">
                Test API Connection
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Results</h2>
                <p className="text-gray-500">
                  Showing calculated CGPA for {getFilteredAndSortedStudents().length} of {result.data.length} students
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleDownload} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null)
                    setSearchQuery("")
                  }}
                >
                  Upload New File
                </Button>
              </div>
            </div>

            <Tabs defaultValue="students" className="w-full" onValueChange={(value) => setActiveTab(value)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="students" className="text-base">
                  Student Results
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-base">
                  Analytics
                </TabsTrigger>
              </TabsList>

              {activeTab === "students" && (
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          Sort by: {sortBy === "name" ? "Name" : sortBy === "id" ? "ID" : "CGPA"}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortBy("name")}>
                          Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("id")}>
                          Student ID {sortBy === "id" && (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("cgpa")}>
                          CGPA {sortBy === "cgpa" && (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="icon" onClick={toggleSortOrder}>
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </Button>

                    <div className="border rounded-md flex">
                      <Button
                        variant={activeView === "grid" ? "default" : "ghost"}
                        size="icon"
                        className="rounded-r-none"
                        onClick={() => setActiveView("grid")}
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" />
                      <Button
                        variant={activeView === "list" ? "default" : "ghost"}
                        size="icon"
                        className="rounded-l-none"
                        onClick={() => setActiveView("list")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <TabsContent value="students" className="mt-0">
                {activeView === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getFilteredAndSortedStudents().map((student, index) => {
                      const courses = extractCourses(student)

                      return (
                        <Card
                          key={index}
                          className="overflow-hidden border-black/5 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <CardHeader className="pb-2 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{student.Name}</CardTitle>
                                <CardDescription>{student.StudentID}</CardDescription>
                              </div>
                              <div className="flex flex-col items-end">
                                <Badge className={`${getCgpaColor(student.cgpa)} font-medium text-lg px-3 py-1`}>
                                  {student.cgpa.toFixed(2)}
                                </Badge>
                                <span className="text-xs mt-1 text-gray-500">{getGradeLabel(student.cgpa)}</span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="text-xs uppercase font-semibold text-gray-500 mb-2">Courses</div>
                            <div className="grid grid-cols-2 gap-2">
                              {courses.map((course, idx) => (
                                <div key={idx} className="flex justify-between border rounded-md p-2 text-sm">
                                  <span className="font-medium">{course.code}</span>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {course.grade}
                                    </Badge>
                                    <span className="text-gray-500">({course.unit} units)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="border-black/5 shadow-sm">
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Student ID</TableHead>
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold">Courses</TableHead>
                            <TableHead className="font-semibold text-right">CGPA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredAndSortedStudents().map((student, index) => {
                            const courses = extractCourses(student)

                            return (
                              <TableRow key={index} className="hover:bg-gray-50">
                                <TableCell className="font-medium">{student.StudentID}</TableCell>
                                <TableCell>{student.Name}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {courses.map((course, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {course.code}: {course.grade}/{course.unit}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <Badge className={`${getCgpaColor(student.cgpa)} font-medium`}>
                                      {student.cgpa.toFixed(2)}
                                    </Badge>
                                    <span className="text-xs mt-1 text-gray-500">{getGradeLabel(student.cgpa)}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-black/5 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">CGPA Distribution</CardTitle>
                      <CardDescription>Overview of student performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result && (
                        <div className="space-y-4">
                          {[
                            { range: "4.5 - 5.0", label: "Excellent", color: "bg-green-500" },
                            { range: "3.5 - 4.49", label: "Very Good", color: "bg-blue-500" },
                            { range: "2.5 - 3.49", label: "Good", color: "bg-yellow-500" },
                            { range: "1.5 - 2.49", label: "Fair", color: "bg-orange-500" },
                            { range: "0 - 1.49", label: "Poor", color: "bg-red-500" },
                          ].map((category, idx) => {
                            const count = result.data.filter((student) => {
                              if (category.range === "4.5 - 5.0") return student.cgpa >= 4.5
                              if (category.range === "3.5 - 4.49") return student.cgpa >= 3.5 && student.cgpa < 4.5
                              if (category.range === "2.5 - 3.49") return student.cgpa >= 2.5 && student.cgpa < 3.5
                              if (category.range === "1.5 - 2.49") return student.cgpa >= 1.5 && student.cgpa < 2.5
                              return student.cgpa < 1.5
                            }).length

                            const percentage = (count / result.data.length) * 100

                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                                    <span>
                                      {category.label} ({category.range})
                                    </span>
                                  </div>
                                  <span className="font-medium">{count} students</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                  <div
                                    className={`${category.color} h-2 rounded-full`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-black/5 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Summary</CardTitle>
                      <CardDescription>Key statistics about student performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded-lg p-4 text-center">
                              <div className="text-3xl font-bold">
                                {(
                                  result.data.reduce((sum, student) => sum + student.cgpa, 0) / result.data.length
                                ).toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">Average CGPA</div>
                            </div>
                            <div className="border rounded-lg p-4 text-center">
                              <div className="text-3xl font-bold">
                                {Math.max(...result.data.map((student) => student.cgpa)).toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">Highest CGPA</div>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium mb-2">Top Performing Students</div>
                            <div className="space-y-2">
                              {[...result.data]
                                .sort((a, b) => b.cgpa - a.cgpa)
                                .slice(0, 3)
                                .map((student, idx) => (
                                  <div key={idx} className="flex justify-between items-center border-b pb-2">
                                    <div>
                                      <div className="font-medium">{student.Name}</div>
                                      <div className="text-sm text-gray-500">{student.StudentID}</div>
                                    </div>
                                    <Badge className={`${getCgpaColor(student.cgpa)}`}>{student.cgpa.toFixed(2)}</Badge>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </main>
  )
}
