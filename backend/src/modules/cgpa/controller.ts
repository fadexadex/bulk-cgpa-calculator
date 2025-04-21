import { Request, Response, NextFunction } from "express";
import { parseCsv } from "../../utils/parseCsv";
import fs from "fs";
import path from "path";
import { Parser } from "json2csv";
import { AppError } from "../../middlewares";

type Row = {
  matricNo: string;
  name: string;
  courseCode: string;
  courseName: string;
  score: string;
  unit: string;
};

export class Controller {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) throw new AppError("No file uploaded", 400);

      const rawData = await parseCsv(file.path); 

      fs.unlinkSync(file.path)

      const scoreToPoint = (score: number) => {
        if (score >= 70) return 5;
        if (score >= 60) return 4;
        if (score >= 50) return 3;
        if (score >= 45) return 2;
        if (score >= 40) return 1;
        return 0;
      };

      const enrichedData = rawData.map((row: any) => {
        let totalPoints = 0;
        let totalUnits = 0;

        for (let i = 1; i <= 10; i++) {
          const gradeStr = row[`Grade${i}`];
          const unitStr = row[`Unit${i}`];

          if (!gradeStr || !unitStr) break;

          const grade = parseFloat(gradeStr);
          const unit = parseFloat(unitStr);

          if (!isNaN(grade) && !isNaN(unit)) {
            const point = scoreToPoint(grade);
            totalPoints += point * unit;
            totalUnits += unit;
          }
        }

        const cgpa =
          totalUnits > 0
            ? parseFloat((totalPoints / totalUnits).toFixed(2))
            : 0;

        return {
          ...row,
          cgpa, 
        };
      });

      const parser = new Parser();
      const csv = parser.parse(enrichedData);
      const filename = `processed-${Date.now()}.csv`;
      const outputPath = path.join("uploads", filename);

      fs.writeFileSync(outputPath, csv);

      return res.status(200).json({
        message: "CGPA calculated successfully",
        data: enrichedData,
        download: `${process.env.BASEURL}/api/v1/cgpa/download/${filename}`,
      });
    } catch (error) {
      next(error);
    }
  }

  async download(req: Request, res: Response) {
    const { filename } = req.params;
    const filePath = path.join("uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({ message: "Failed to download file" });
      }

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Error deleting file:", unlinkErr);
        }
      });
    });
  }
}
