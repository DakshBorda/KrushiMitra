import instance from "./config";
import Cookies from "js-cookie";

export const getEquips = async () => {
  try {
    return await instance.get("/api/equipment");
  } catch (error) {
    console.log("Error while calling getEquips API", error);
  }
};

export const getBrands = async () => {
  try {
    return await instance.get("/api/brand/");
  } catch (error) {
    console.log("Error while calling getBrands API", error);
  }
};
// /api/brand/

export const getEquip = async (id) => {
  try {
    return await instance.get(`/api/equipment/${id}`);
  } catch (error) {
    console.log("Error while calling getEquip API", error);
  }
};

export const getEquipsList = async () => {
  try {
    return await instance.get("/api/equipment_type");
  } catch (error) {
    console.log("Error while calling getEquipsList API", error);
  }
};

export const createEquipmentReport = async ({
  equipment,
  report_reason,
  description,
}) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.post(
      "/enquiry/report-equipment",
      {
        equipment,
        report_reason,
        description,
      },
      { headers }
    );
  } catch (error) {
    console.log("Error while calling createEquipmentReport API", error);
  }
};

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
};

export const createEquipment = async (data, images = {}) => {
  try {
    const formData = new FormData();
    formData.append("manufacturer", toInt(data.manufacturer));
    formData.append("title", String(data.title || "").trim());
    formData.append("description", String(data.description || "").trim());
    formData.append("equipment_type", toInt(data.equipment_type));
    formData.append("available_start_time", data.available_start_time || new Date().toISOString().slice(0, 10));
    formData.append("available_end_time", data.available_end_time || new Date().toISOString().slice(0, 10));
    formData.append("equipment_location", String(data.equipment_location || "").trim());
    formData.append("daily_rental", toInt(data.daily_rental));
    formData.append("hourly_rental", toInt(data.hourly_rental));
    formData.append("manufacturing_year", toInt(data.manufacturing_year));
    formData.append("model", String(data.model || "").trim());
    formData.append("condition", data.condition === "Used" ? "Used" : "New");
    formData.append("horsepower", toInt(data.horsepower));
    formData.append("width", toInt(data.width));
    formData.append("height", toInt(data.height));
    formData.append("weight", toInt(data.weight));

    // Append image files if provided
    ["image_1", "image_2", "image_3", "image_4", "image_5"].forEach((key) => {
      if (images[key]) {
        formData.append(key, images[key]);
      }
    });

    const headers = {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.post("/api/equipment/create/", formData, { headers });
  } catch (error) {
    console.log("Error while calling createEquipment API", error);
    throw error;
  }
};

export const getMyEquipments = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get("/api/equipment/my/", { headers });
  } catch (error) {
    console.log("Error while calling getMyEquipments API", error);
    throw error;
  }
};

export const updateEquipment = async (id, data, images = {}) => {
  try {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
    ["image_1", "image_2", "image_3", "image_4", "image_5"].forEach((key) => {
      if (images[key]) {
        formData.append(key, images[key]);
      }
    });
    const headers = {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.patch(`/api/equipment/update/${id}/`, formData, { headers });
  } catch (error) {
    console.log("Error while calling updateEquipment API", error);
    throw error;
  }
};

export const deleteEquipment = async (id) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.delete(`/api/equipment/delete/${id}/`, { headers });
  } catch (error) {
    console.log("Error while calling deleteEquipment API", error);
    throw error;
  }
};

// Booking api

// export const getBookings = async () => {
//     try {
//         const headers = {
//             "Content-Type": "application/json",
//             Authorization: `"Bearer ${Cookies.get('access-token')}`
//         };
//         return await instance.get('/api/booking' , { headers });
//     } catch(error) {
//         console.log('Error while calling getBookings API', error);
//     }
// }

// export const getBookingDetail = async (id) => {
//     try {
//         const headers = {
//             "Content-Type": "application/json",
//             Authorization: `"Bearer ${Cookies.get('access-token')}`
//         };
//         return await instance.get(`/api/booking/detail/${id}` , { headers });
//     } catch(error) {
//         console.log('Error while calling getBookingDetail API', error);
//     }
// }

// export const updateBooking = async (data, id) => {
//     try {
//         const headers = {
//             "Content-Type": "application/json",
//             Authorization: `"Bearer ${Cookies.get('access-token')}`
//         };
//         return await instance.get(`/api/booking/update/${id}` , { data }, { headers });
//     } catch(error) {
//         console.log('Error while calling getBookingDetail API', error);
//     }
// }

//  Feedback
export const submitFeedback = async ({ name, phone_number, description }) => {
  try {
    return await instance.post("/enquiry/feedback", {
      name,
      phone_number,
      description,
    });
  } catch (error) {
    console.log("Error while calling submitFeedback API", error);
  }
};
