const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const salesreportPage = async (req, res) => {
  try {
    const selectRange = req.query.selectRange;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const page = req.query.page;
    const limit = 6;
    const skip = (page - 1) * limit;

    let filter = { status: "Delivered" };

    const today = new Date();
    let fromDate, toDate;

    if (startDate && endDate) {
      fromDate = new Date(startDate);
      toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    } else if (selectRange === "today") {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    } else if (selectRange === "thisWeek") {
      const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() - diffToMonday);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    } else if (selectRange === "thisMonth") {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    } else if (selectRange === "thisYear") {
      fromDate = new Date(today.getFullYear(), 0, 1);
      toDate = new Date(today.getFullYear(), 11, 31);
      toDate.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: fromDate, $lte: toDate };
    }

    const orders = await Order.find(filter).sort({ createdOn: -1 });
    //   .skip(skip)
    //   .limit(limit);

    const totalOrders = await Order.find(filter).countDocuments();

    // calculating total values

    let completeAmount = 0;
    let completeFinalAmount = 0;

    orders.forEach((order) => {
      completeAmount += order.totalAmount;
      completeFinalAmount += order.finalAmount;
    });

    const completeDiscount = completeAmount - completeFinalAmount;

    const numOfSales = orders.length;

    // const totalPages = totalOrders / limit;
    res.render("salesreport", {
      orders,
      //   totalPages,
      //   currentPage: page,
      selectRange,
      startDate,
      endDate,
      numOfSales,
      completeDiscount,
      completeAmount,
      completeFinalAmount,
    });
  } catch (error) {
    console.log("error from salesreportPage", error);
  }
};

// download excel sales report

const salesreportExcel = async (req, res) => {
  try {
    const orders = await Order.find({ status: "Delivered" });

    const totalOrders = orders.length;
    const totalAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const finalAmount = orders.reduce(
      (sum, order) => sum + order.finalAmount,
      0
    );
    const totalDiscount = totalAmount - finalAmount;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "_id", width: 30 },
      { header: "Date", key: "createdOn", width: 15 },
      { header: "Total Amount", key: "totalAmount", width: 15 },
      { header: "Discount", key: "discount", width: 15 },
      { header: "Final Amount", key: "finalAmount", width: 15 },
      { header: "Payment Method", key: "paymentMethod", width: 20 },
    ];

    orders.forEach((order) => {
      worksheet.addRow({
        _id: order._id.toString(),
        createdOn: order.createdOn.toISOString().slice(0, 10),
        totalAmount: order.totalAmount,
        discount: order.totalAmount - order.finalAmount,
        finalAmount: order.finalAmount,
        paymentMethod: order.paymentMethod,
      });
    });

    worksheet.addRow([]);
    worksheet.addRow(["Summary"]);
    worksheet.addRow(["Total Orders", totalOrders]);
    worksheet.addRow(["Total Amount", totalAmount]);
    worksheet.addRow(["Total Discount", totalDiscount]);
    worksheet.addRow(["Final Amount", finalAmount]);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log("error from salesreportExcel", error);
  }
};

// download pdf sales report

const salesreportPdf = async (req, res) => {
  try {
    const orders = await Order.find({ status: "Delivered" });

    const totalOrders = orders.length;
    const totalAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const totalDiscount = orders.reduce(
      (sum, order) => sum + (order.totalAmount - order.finalAmount),
      0
    );
    const finalAmount = orders.reduce(
      (sum, order) => sum + order.finalAmount,
      0
    );

    // Initialize PDF document
    const generateSalesReport = (
      orders,
      totalOrders,
      totalAmount,
      totalDiscount,
      finalAmount,
      res
    ) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      // Set response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.pdf"
      );
      doc.pipe(res);

      // === Helper Functions ===
      const drawLine = (x1, y1, x2, y2, color = "#cccccc", width = 1) => {
        doc
          .strokeColor(color)
          .lineWidth(width)
          .moveTo(x1, y1)
          .lineTo(x2, y2)
          .stroke();
      };

      // === Header Section ===
      doc
        .font("Helvetica-Bold")
        .fontSize(30)
        .fillColor("#1a3c34")
        .text("WATCHSY", 50, 40, { align: "center" });

      doc
        .font("Helvetica")
        .fontSize(18)
        .fillColor("#333333")
        .text("SALES REPORT", 50, 70, { align: "center" });

      // Add a horizontal line below header
      drawLine(50, 90, 550, 90, "#1a3c34", 2);
      doc.moveDown(1);

      // === Company Info ===
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#555555")
        .text("WATCHSY Pvt. Ltd.", 50, 100)
        .text("123 Business Street, Commerce City", 50, 115)
        .text("Email: support@watchsy.com", 50, 130)
        .text("Phone: +91 123 456 7890", 50, 145);

      // === Report Info (instead of customer info) ===
      const infoTop = 100;
      const infoX = 350;
      const reportDate = new Date("2025-05-21"); // Using current date as per system info
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#333333")
        .text(
          `Report Date: ${reportDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}`,
          infoX,
          infoTop,
          { align: "right", width: 200 }
        )
        .text(`Total Orders: ${totalOrders}`, infoX, infoTop + 20, {
          align: "right",
          width: 200,
        });

      doc.moveDown(2);

      // === Table Header ===
      const tableTop = doc.y;
      const colWidths = [90, 80, 80, 80, 80, 100];
      const colSpacing = 10;
      const col1 = 50; // Order ID
      const col2 = col1 + colWidths[0] + colSpacing; // Date
      const col3 = col2 + colWidths[1] + colSpacing; // Total
      const col4 = col3 + colWidths[2] + colSpacing; // Discount
      const col5 = col4 + colWidths[3] + colSpacing; // Final
      const col6 = col5 + colWidths[4] + colSpacing; // Payment

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#1a3c34")
        .text("Order ID", col1, tableTop, {
          width: colWidths[0],
          align: "left",
        })
        .text("Date", col2, tableTop, { width: colWidths[1], align: "left" })
        .text("Total", col3, tableTop, { width: colWidths[2], align: "right" })
        .text("Discount", col4, tableTop, {
          width: colWidths[3],
          align: "right",
        })
        .text("Final", col5, tableTop, { width: colWidths[4], align: "right" })
        .text("Payment", col6, tableTop, {
          width: colWidths[5],
          align: "left",
        });

      // Draw table header underline
      drawLine(col1, tableTop + 15, col1 + 500, tableTop + 15, "#1a3c34", 1.5);

      // === Table Rows ===
      let yPos = tableTop + 25;
      doc.font("Helvetica").fontSize(11).fillColor("#333333");
      orders.forEach((order) => {
        // Check for page overflow
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const rowHeight = 20; // Fixed row height for simplicity
        const row = [
          order._id.toString().slice(-6),
          order.createdOn.toISOString().slice(0, 10),
          `Rs. ${order.totalAmount.toFixed(2)}`,
          `Rs. ${(order.totalAmount - order.finalAmount).toFixed(2)}`,
          `Rs. ${order.finalAmount.toFixed(2)}`,
          order.paymentMethod,
        ];

        doc
          .text(row[0], col1, yPos, { width: colWidths[0], align: "left" })
          .text(row[1], col2, yPos, { width: colWidths[1], align: "left" })
          .text(row[2], col3, yPos, { width: colWidths[2], align: "right" })
          .text(row[3], col4, yPos, { width: colWidths[3], align: "right" })
          .text(row[4], col5, yPos, { width: colWidths[4], align: "right" })
          .text(row[5], col6, yPos, { width: colWidths[5], align: "left" });

        yPos += rowHeight + 5;
      });

      // Draw table bottom line
      const tableBottom = yPos;
      drawLine(col1, tableBottom, col1 + 500, tableBottom, "#1a3c34", 1.5);

      // Ensure enough space before summary
      if (tableBottom + 40 > 700) {
        doc.addPage();
        doc.y = 50;
      } else {
        doc.y = tableBottom + 40;
      }

      // === Summary Section ===
      const summaryTop = doc.y;
      const labelX = 350;
      const valueX = 470;

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#333333")
        .text("Total Orders:", labelX, summaryTop, {
          width: 100,
          align: "right",
        })
        .text(`${totalOrders}`, valueX, summaryTop, {
          width: 80,
          align: "right",
        });

      doc
        .text("Total Amount:", labelX, summaryTop + 20, {
          width: 100,
          align: "right",
        })
        .text(`Rs. ${totalAmount.toFixed(2)}`, valueX, summaryTop + 20, {
          width: 80,
          align: "right",
        });

      doc
        .text("Total Discount:", labelX, summaryTop + 40, {
          width: 100,
          align: "right",
        })
        .text(`Rs. ${totalDiscount.toFixed(2)}`, valueX, summaryTop + 40, {
          width: 80,
          align: "right",
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#1a3c34")
        .text("Final Amount:", labelX, summaryTop + 60, {
          width: 100,
          align: "right",
        })
        .text(`Rs. ${finalAmount.toFixed(2)}`, valueX, summaryTop + 60, {
          width: 80,
          align: "right",
        });

      // === Footer ===
      const footerTop = doc.page.height - 100;
      drawLine(50, footerTop - 10, 550, footerTop - 10, "#1a3c34", 1);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#555555")
        .text("Thank you", 50, footerTop, {
          align: "center",
        })
        .text(
          "For inquiries, contact us at support@watchsy.com",
          50,
          footerTop + 15,
          { align: "center" }
        );

      doc.end();
    };

    // Sample data for testing
    const sampleOrders = [
      {
        _id: "1234567890abcdef",
        createdOn: new Date("2025-05-20"),
        totalAmount: 1500,
        finalAmount: 1400,
        paymentMethod: "Credit Card",
      },
      {
        _id: "0987654321fedcba",
        createdOn: new Date("2025-05-19"),
        totalAmount: 500,
        finalAmount: 450,
        paymentMethod: "PayPal",
      },
      {
        _id: "abcdef1234567890",
        createdOn: new Date("2025-05-18"),
        totalAmount: 200,
        finalAmount: 200,
        paymentMethod: "Cash",
      },
    ];
    const sampleTotalOrders = sampleOrders.length;
    const sampleTotalAmount = sampleOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const sampleTotalDiscount = sampleOrders.reduce(
      (sum, order) => sum + (order.totalAmount - order.finalAmount),
      0
    );
    const sampleFinalAmount = sampleOrders.reduce(
      (sum, order) => sum + order.finalAmount,
      0
    );

    generateSalesReport(
      sampleOrders,
      sampleTotalOrders,
      sampleTotalAmount,
      sampleTotalDiscount,
      sampleFinalAmount,
      res
    );
  } catch (error) {
    console.log("error from salesreportPdf", error);
  }
};
module.exports = {
  salesreportPage,
  salesreportExcel,
  salesreportPdf,
};
